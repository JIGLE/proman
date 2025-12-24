import { PrismaClient } from '@prisma/client';
import {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
} from './types';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

// Property operations
export const propertyService = {
  async getAll(): Promise<Property[]> {
    const properties = await getPrismaClient().property.findMany({
      include: { tenants: true, receipts: true },
    });
    return properties.map(p => ({
      ...p,
      description: p.description || undefined,
      image: p.image || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  },

  async getById(id: string): Promise<Property | null> {
    const property = await getPrismaClient().property.findUnique({
      where: { id },
      include: { tenants: true, receipts: true },
    });
    if (!property) return null;
    return {
      ...property,
      description: property.description || undefined,
      image: property.image || undefined,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async create(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const property = await getPrismaClient().property.create({
      data: {
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
    return {
      ...property,
      description: property.description || undefined,
      image: property.image || undefined,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async update(id: string, data: Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Property> {
    const property = await getPrismaClient().property.update({
      where: { id },
      data: {
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
    return {
      ...property,
      description: property.description || undefined,
      image: property.image || undefined,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async delete(id: string): Promise<void> {
    await getPrismaClient().property.delete({ where: { id } });
  },
};

// Tenant operations
export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    const tenants = await getPrismaClient().tenant.findMany({
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

  async getById(id: string): Promise<Tenant | null> {
    const tenant = await getPrismaClient().tenant.findUnique({
      where: { id },
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

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'propertyName'>): Promise<Tenant> {
    const tenant = await getPrismaClient().tenant.create({
      data: {
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

  async update(id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'propertyName'>>): Promise<Tenant> {
    const tenant = await getPrismaClient().tenant.update({
      where: { id },
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

  async delete(id: string): Promise<void> {
    await getPrismaClient().tenant.delete({ where: { id } });
  },
};

// Receipt operations
export const receiptService = {
  async getAll(): Promise<Receipt[]> {
    const receipts = await getPrismaClient().receipt.findMany({
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

  async getById(id: string): Promise<Receipt | null> {
    const receipt = await getPrismaClient().receipt.findUnique({
      where: { id },
      include: { tenant: true, property: true },
    });
    if (!receipt) return null;
    const { tenant, property, ...receiptData } = receipt;
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

  async create(data: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>): Promise<Receipt> {
    const receipt = await getPrismaClient().receipt.create({
      data: {
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
    const { tenant, property, ...receiptData } = receipt;
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

  async update(id: string, data: Partial<Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>>): Promise<Receipt> {
    const receipt = await getPrismaClient().receipt.update({
      where: { id },
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
    const { tenant, property, ...receiptData } = receipt;
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

  async delete(id: string): Promise<void> {
    await getPrismaClient().receipt.delete({ where: { id } });
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
  async getAll(): Promise<Correspondence[]> {
    const correspondence = await getPrismaClient().correspondence.findMany({
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

  async getById(id: string): Promise<Correspondence | null> {
    const correspondence = await getPrismaClient().correspondence.findUnique({
      where: { id },
      include: { template: true, tenant: true },
    });
    if (!correspondence) return null;
    const { template, tenant, ...correspondenceData } = correspondence;
    return {
      ...correspondenceData,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async create(data: Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt' | 'tenantName'>): Promise<Correspondence> {
    const correspondence = await getPrismaClient().correspondence.create({
      data: {
        templateId: data.templateId,
        tenantId: data.tenantId,
        subject: data.subject,
        content: data.content,
        status: data.status,
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
      },
      include: { template: true, tenant: true },
    });
    const { template, tenant, ...correspondenceData } = correspondence;
    return {
      ...correspondenceData,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async update(id: string, data: Partial<Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt' | 'tenantName'>>): Promise<Correspondence> {
    const correspondence = await getPrismaClient().correspondence.update({
      where: { id },
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
    const { template, tenant, ...correspondenceData } = correspondence;
    return {
      ...correspondenceData,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async delete(id: string): Promise<void> {
    await getPrismaClient().correspondence.delete({ where: { id } });
  },
};

// Database initialization and seeding
export async function initializeDatabase() {
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