import { PrismaClient } from '@prisma/client';
import { createSqliteDriverAdapterFactory } from './sqlite-adapter';
import {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
} from './types';

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Only initialize PrismaClient if we have a database URL (not during build)
    if (process.env.DATABASE_URL) {
      // Improve diagnostics: for sqlite, check file before constructing Prisma
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl.startsWith('file:')) {
          const sqlitePath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '');
          const resolvedPath = require('path').resolve(process.cwd(), sqlitePath);
          try {
            // Use eval('require') to avoid bundlers trying to resolve server-only modules
            const fs = eval("require")('fs');
            const exists = fs.existsSync(resolvedPath);
            const writable = exists ? (() => {
              try {
                fs.accessSync(resolvedPath, fs.constants.W_OK);
                return true;
              } catch {
                return false;
              }
            })() : false;
            console.log('[database] Using SQLite at', resolvedPath, 'exists:', exists, 'writable:', writable);
            if (!exists) {
              throw new Error(`SQLite DB file does not exist: ${resolvedPath}. Ensure a writable dataset is mounted at the path and create the file, or use POST /api/debug/db/init to create it.`);
            }
            if (!writable) {
              throw new Error(`SQLite DB file is not writable: ${resolvedPath}. Fix dataset permissions (chown/chmod) so the process can write the file.`);
            }
          } catch (fsErr: unknown) {
            const message = fsErr instanceof Error ? fsErr.message : String(fsErr);
            console.error('[database] Filesystem check failed:', message);
            throw new Error(message);
          }
        } else {
          console.log('[database] Using non-sqlite datasource (url type):', dbUrl.startsWith('postgres') || dbUrl.startsWith('postgresql') ? 'postgres' : 'unknown');
        }

        // Construct PrismaClient using environment configuration (DATABASE_URL)
        // Passing datasource overrides to the constructor is not supported in this runtime,
        // so rely on `process.env.DATABASE_URL` being set inside the container.
        try {
          // Diagnostics: log environment & available prisma files to assist CI debugging
          try {
            const fs = require('fs');
            const path = require('path');
            console.log('[database] Constructing PrismaClient; diagnostics:', {
              cwd: process.cwd(),
              nodeEnv: process.env.NODE_ENV,
              databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL : '(none)',
              prismaClientResolved: (() => {
                try {
                  return require.resolve('@prisma/client');
                } catch {
                  return undefined;
                }
              })(),
              prismaClientExists: fs.existsSync(path.resolve(process.cwd(), 'node_modules', '@prisma', 'client')),
              prismaGeneratedExists: fs.existsSync(path.resolve(process.cwd(), 'node_modules', '.prisma', 'client')),
            });
          } catch (diagErr: unknown) {
            console.warn('[database] Diagnostics failed:', diagErr instanceof Error ? diagErr.message : String(diagErr))
          }

          try {
            // If we're using SQLite, provide a lightweight adapter so Prisma Client can initialize.
            if (dbUrl.startsWith('file:')) {
              try {
                  const adapterFactory = createSqliteDriverAdapterFactory(process.env.DATABASE_URL);
                  globalForPrisma.prisma = new PrismaClient({ adapter: adapterFactory });
                } catch (adapterErr: unknown) {
                  console.warn('[database] Failed to initialize sqlite adapter, falling back to default constructor:', adapterErr instanceof Error ? adapterErr.message : String(adapterErr));
                  globalForPrisma.prisma = new PrismaClient();
                }
            } else {
              globalForPrisma.prisma = new PrismaClient();
            }
          } catch (pcInitErr: unknown) {
            const msg = pcInitErr instanceof Error ? pcInitErr.message : String(pcInitErr);
            if (msg.includes('needs to be constructed with a non-empty')) {
              console.warn('[database] PrismaClient init requires options; retrying with {}');
              globalForPrisma.prisma = new PrismaClient({});
              } else if (msg.includes('requires either "adapter" or "accelerateUrl"')) {
              // Retry with explicit sqlite adapter if we failed to pick it up earlier
              try {
                const adapterFactory = createSqliteDriverAdapterFactory(process.env.DATABASE_URL);
                globalForPrisma.prisma = new PrismaClient({ adapter: adapterFactory });
              } catch {
                throw pcInitErr;
              }
            } else {
              throw pcInitErr;
            }
          }
          console.log('[database] PrismaClient constructed successfully');
        } catch (pcErr: unknown) {
          const message = pcErr instanceof Error ? pcErr.message : String(pcErr);
          const name = pcErr instanceof Error && (pcErr as Error).name ? (pcErr as Error).name : 'UnknownError';
          const stack = pcErr instanceof Error ? (pcErr as Error).stack : undefined;
          console.error('[database] Failed to construct PrismaClient:', name, message);
          if (stack) console.error(stack);
          throw new Error(`Prisma initialization failed: ${message}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error && (err as Error).name ? (err as Error).name : 'UnknownError';
        const stack = err instanceof Error ? (err as Error).stack : undefined;
        console.error('[database] Failed to construct PrismaClient:', name, message);
        if (stack) console.error(stack);
        throw new Error(`Prisma initialization failed: ${message}`);
      }
    } else {
      // During build time, create a mock client that throws an error if used
      globalForPrisma.prisma = new Proxy({} as PrismaClient, {
        get: (target, prop) => {
          if (prop === '$connect' || prop === '$disconnect') {
            return () => Promise.resolve();
          }
          throw new Error('PrismaClient not available during build time');
        },
      });
    }
  }
  return globalForPrisma.prisma;
}

export { getPrismaClient };
// Remove the default prisma export to prevent build-time initialization
// export const prisma = getPrismaClient();

// Property operations
export const propertyService = {
  async getAll(userId: string): Promise<Property[]> {
    const properties = await getPrismaClient().property.findMany({
      where: { userId },
      include: { tenants: true, receipts: true },
    });
    return properties.map(p => ({
      ...p,
      streetAddress: p.streetAddress || undefined,
      city: p.city || undefined,
      zipCode: p.zipCode || undefined,
      country: p.country || undefined,
      latitude: p.latitude || undefined,
      longitude: p.longitude || undefined,
      addressVerified: p.addressVerified || false,
      buildingId: p.buildingId || undefined,
      buildingName: p.buildingName || undefined,
      description: p.description || undefined,
      image: p.image || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  },

  async getById(userId: string, id: string): Promise<Property | null> {
    const property = await getPrismaClient().property.findUnique({
      where: { id, userId },
      include: { tenants: true, receipts: true },
    });
    if (!property) return null;
    return {
      ...property,
      streetAddress: property.streetAddress || undefined,
      city: property.city || undefined,
      zipCode: property.zipCode || undefined,
      country: property.country || undefined,
      latitude: property.latitude || undefined,
      longitude: property.longitude || undefined,
      addressVerified: property.addressVerified || false,
      buildingId: property.buildingId || undefined,
      buildingName: property.buildingName || undefined,
      description: property.description || undefined,
      image: property.image || undefined,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async create(userId: string, data: Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const property = await getPrismaClient().property.create({
      data: {
        userId,
        name: data.name,
        address: data.address,
        type: data.type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        rent: data.rent,
        status: data.status,
        description: data.description,
        image: data.image,
      },
    });
    // Debug: log created property to aid in diagnosing null/shape issues during tests
    try {
      console.log('[database] created property:', property);
    } catch {}
    return {
      ...property,
      streetAddress: property.streetAddress || undefined,
      city: property.city || undefined,
      zipCode: property.zipCode || undefined,
      country: property.country || undefined,
      latitude: property.latitude || undefined,
      longitude: property.longitude || undefined,
      addressVerified: property.addressVerified || false,
      buildingId: property.buildingId || undefined,
      buildingName: property.buildingName || undefined,
      description: property.description || undefined,
      image: property.image || undefined,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async update(userId: string, id: string, data: Partial<Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Property> {
    const property = await getPrismaClient().property.update({
      where: { id, userId },
      data: {
        name: data.name,
        address: data.address,
        streetAddress: data.streetAddress,
        city: data.city,
        zipCode: data.zipCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        addressVerified: data.addressVerified,
        buildingId: data.buildingId,
        buildingName: data.buildingName,
        type: data.type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        rent: data.rent,
        status: data.status,
        description: data.description,
        image: data.image,
      },
    });
    return {
      ...property,
      streetAddress: property.streetAddress || undefined,
      city: property.city || undefined,
      zipCode: property.zipCode || undefined,
      country: property.country || undefined,
      latitude: property.latitude || undefined,
      longitude: property.longitude || undefined,
      addressVerified: property.addressVerified || false,
      buildingId: property.buildingId || undefined,
      buildingName: property.buildingName || undefined,
      description: property.description || undefined,
      image: property.image || undefined,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async delete(userId: string, id: string): Promise<void> {
    await getPrismaClient().property.delete({ where: { id, userId } });
  },
};

// Tenant operations
export const tenantService = {
  async getAll(userId: string): Promise<Tenant[]> {
    const tenants = await getPrismaClient().tenant.findMany({
      where: { userId },
      include: { property: true, receipts: true, correspondence: true },
    });
    return tenants.map(t => ({
      ...t,
      leaseStart: t.leaseStart.toISOString().split('T')[0],
      leaseEnd: t.leaseEnd.toISOString().split('T')[0],
      propertyId: t.propertyId || undefined,
      lastPayment: t.lastPayment?.toISOString(),
      notes: t.notes || undefined,
      propertyName: t.property?.name,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  },

  async getById(userId: string, id: string): Promise<Tenant | null> {
    const tenant = await getPrismaClient().tenant.findUnique({
      where: { id, userId },
      include: { property: true, receipts: true, correspondence: true },
    });
    if (!tenant) return null;
    return {
      ...tenant,
      propertyId: tenant.propertyId || undefined,
      leaseStart: tenant.leaseStart.toISOString().split('T')[0],
      leaseEnd: tenant.leaseEnd.toISOString().split('T')[0],
      lastPayment: tenant.lastPayment?.toISOString(),
      notes: tenant.notes || undefined,
      propertyName: tenant.property?.name,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },

  async create(userId: string, data: Omit<Tenant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'propertyName'>): Promise<Tenant> {
    const tenant = await getPrismaClient().tenant.create({
      data: {
        userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        propertyId: data.propertyId,
        rent: data.rent,
        leaseStart: new Date(data.leaseStart),
        leaseEnd: new Date(data.leaseEnd),
        paymentStatus: data.paymentStatus,
        lastPayment: data.lastPayment ? new Date(data.lastPayment) : null,
        notes: data.notes,
      },
      include: { property: true },
    });
    return {
      ...tenant,
      propertyId: tenant.propertyId || undefined,
      leaseStart: tenant.leaseStart.toISOString().split('T')[0],
      leaseEnd: tenant.leaseEnd.toISOString().split('T')[0],
      lastPayment: tenant.lastPayment?.toISOString(),
      notes: tenant.notes || undefined,
      propertyName: tenant.property?.name,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },

  async update(userId: string, id: string, data: Partial<Omit<Tenant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'propertyName'>>): Promise<Tenant> {
    const tenant = await getPrismaClient().tenant.update({
      where: { id, userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        propertyId: data.propertyId,
        rent: data.rent,
        leaseStart: data.leaseStart ? new Date(data.leaseStart) : undefined,
        leaseEnd: data.leaseEnd ? new Date(data.leaseEnd) : undefined,
        paymentStatus: data.paymentStatus,
        lastPayment: data.lastPayment ? new Date(data.lastPayment) : undefined,
        notes: data.notes,
      },
      include: { property: true },
    });
    return {
      ...tenant,
      propertyId: tenant.propertyId || undefined,
      leaseStart: tenant.leaseStart.toISOString().split('T')[0],
      leaseEnd: tenant.leaseEnd.toISOString().split('T')[0],
      lastPayment: tenant.lastPayment?.toISOString(),
      notes: tenant.notes || undefined,
      propertyName: tenant.property?.name,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },

  async delete(userId: string, id: string): Promise<void> {
    await getPrismaClient().tenant.delete({ where: { id, userId } });
  },
};

// Receipt operations
export const receiptService = {
  async getAll(userId: string): Promise<Receipt[]> {
    const receipts = await getPrismaClient().receipt.findMany({
      where: { userId },
      include: { tenant: true, property: true },
    });
    return receipts.map(r => ({
      ...r,
      description: r.description || undefined,
      date: r.date.toISOString().split('T')[0],
      tenantName: r.tenant.name,
      propertyName: r.property.name,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async getById(userId: string, id: string): Promise<Receipt | null> {
    const receipt = await getPrismaClient().receipt.findUnique({
      where: { id, userId },
      include: { tenant: true, property: true },
    });
    if (!receipt) return null;
    const receiptData = receipt;
    return {
      ...receiptData,
      description: receiptData.description ?? undefined,
      date: receipt.date.toISOString().split('T')[0],
      tenantName: receipt.tenant.name,
      propertyName: receipt.property.name,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  },

  async create(userId: string, data: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>): Promise<Receipt> {
    const receipt = await getPrismaClient().receipt.create({
      data: {
        userId,
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        amount: data.amount,
        date: new Date(data.date),
        type: data.type,
        status: data.status,
        description: data.description,
      },
      include: { tenant: true, property: true },
    });
    const receiptData = receipt;
    return {
      ...receiptData,
      description: receiptData.description ?? undefined,
      date: receipt.date.toISOString().split('T')[0],
      tenantName: receipt.tenant.name,
      propertyName: receipt.property.name,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  },

  async update(userId: string, id: string, data: Partial<Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>>): Promise<Receipt> {
    const receipt = await getPrismaClient().receipt.update({
      where: { id, userId },
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        amount: data.amount,
        date: data.date ? new Date(data.date) : undefined,
        type: data.type,
        status: data.status,
        description: data.description,
      },
      include: { tenant: true, property: true },
    });
    const receiptData = receipt;
    return {
      ...receiptData,
      description: receiptData.description ?? undefined,
      date: receipt.date.toISOString().split('T')[0],
      tenantName: receipt.tenant.name,
      propertyName: receipt.property.name,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  },

  async delete(userId: string, id: string): Promise<void> {
    await getPrismaClient().receipt.delete({ where: { id, userId } });
  },
};

// Template operations
export const templateService = {
  async getAll(): Promise<CorrespondenceTemplate[]> {
    const templates = await getPrismaClient().correspondenceTemplate.findMany({
      include: { correspondence: true },
    });
    return templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  },

  async getById(id: string): Promise<CorrespondenceTemplate | null> {
    const template = await getPrismaClient().correspondenceTemplate.findUnique({
      where: { id },
      include: { correspondence: true },
    });
    if (!template) return null;
    return {
      ...template,
      variables: JSON.parse(template.variables),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  },

  async create(data: Omit<CorrespondenceTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<CorrespondenceTemplate> {
    const template = await getPrismaClient().correspondenceTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables: JSON.stringify(data.variables),
      },
    });
    return {
      ...template,
      variables: JSON.parse(template.variables),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  },

  async update(id: string, data: Partial<Omit<CorrespondenceTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CorrespondenceTemplate> {
    const template = await getPrismaClient().correspondenceTemplate.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables: data.variables ? JSON.stringify(data.variables) : undefined,
      },
    });
    return {
      ...template,
      variables: JSON.parse(template.variables),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  },

  async delete(id: string): Promise<void> {
    await getPrismaClient().correspondenceTemplate.delete({ where: { id } });
  },
};

// Correspondence operations
export const correspondenceService = {
  async getAll(userId: string): Promise<Correspondence[]> {
    const correspondence = await getPrismaClient().correspondence.findMany({
      where: { userId },
      include: { template: true, tenant: true },
    });
    return correspondence.map(c => ({
      ...c,
      tenantName: c.tenant.name,
      sentAt: c.sentAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  },

  async getById(userId: string, id: string): Promise<Correspondence | null> {
    const correspondence = await getPrismaClient().correspondence.findUnique({
      where: { id, userId },
      include: { template: true, tenant: true },
    });
    if (!correspondence) return null;
    const correspondenceData = correspondence;
    return {
      ...correspondenceData,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async create(userId: string, data: Omit<Correspondence, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName'>): Promise<Correspondence> {
    const correspondence = await getPrismaClient().correspondence.create({
      data: {
        userId,
        templateId: data.templateId,
        tenantId: data.tenantId,
        subject: data.subject,
        content: data.content,
        status: data.status,
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
      },
      include: { template: true, tenant: true },
    });
    const correspondenceData = correspondence;
    return {
      ...correspondenceData,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async update(userId: string, id: string, data: Partial<Omit<Correspondence, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName'>>): Promise<Correspondence> {
    const correspondence = await getPrismaClient().correspondence.update({
      where: { id, userId },
      data: {
        templateId: data.templateId,
        tenantId: data.tenantId,
        subject: data.subject,
        content: data.content,
        status: data.status,
        sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
      },
      include: { template: true, tenant: true },
    });
    const correspondenceData = correspondence;
    return {
      ...correspondenceData,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async delete(userId: string, id: string): Promise<void> {
    await getPrismaClient().correspondence.delete({ where: { id, userId } });
  },
};

// Database initialization and seeding
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if we have any templates (indicating database is seeded)
    const templateCount = await getPrismaClient().correspondenceTemplate.count();

    if (templateCount === 0) {
      // Seed initial templates
      await getPrismaClient().correspondenceTemplate.createMany({
        data: [
          {
            name: "Welcome Letter",
            type: "welcome",
            subject: "Welcome to {{property_name}}",
            content: `Dear {{tenant_name}},

Welcome to {{property_name}}! We're excited to have you as our tenant.

Your lease begins on {{lease_start}} and runs through {{lease_end}}.

Property Details:
- Address: {{property_address}}
- Monthly Rent: $\{{rent_amount}}
- Bedrooms: {{bedrooms}}
- Bathrooms: {{bathrooms}}

Please don't hesitate to contact us if you need anything.

Best regards,
Property Management Team`,
            variables: JSON.stringify(["tenant_name", "property_name", "lease_start", "lease_end", "property_address", "rent_amount", "bedrooms", "bathrooms"]),
          },
          {
            name: "Rent Payment Reminder",
            type: "rent_reminder",
            subject: "Rent Payment Due - {{property_name}}",
            content: `Dear {{tenant_name}},

This is a friendly reminder that your rent payment of $\{{rent_amount}} for {{property_name}} is due on {{due_date}}.

Please ensure payment is made by the due date to avoid any late fees.

Payment can be made via:
- Bank transfer to: [Account details]
- Online portal: [Portal link]
- Check mailed to: [Mailing address]

If you have already made this payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
Property Management Team`,
            variables: JSON.stringify(["tenant_name", "property_name", "rent_amount", "due_date"]),
          },
        ],
      });
      console.log('Database seeded with initial templates');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}