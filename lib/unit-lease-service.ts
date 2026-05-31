import { getPrismaClient } from './database';

function tableMissing(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('no such table') || msg.includes('no such table: units') || msg.includes('no such table: leases');
}

export const unitService = {
  async getAll(userId: string) {
    const prisma = getPrismaClient();
    try {
      const units = await prisma.unit.findMany({ where: { userId } });
      return units.map((u: any) => ({
        ...u,
        propertyId: u.propertyId ?? undefined,
        area: u.area ?? undefined,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }));
    } catch (err) {
      if (tableMissing(err)) return [];
      throw err;
    }
  },

  async getById(userId: string, id: string) {
    const prisma = getPrismaClient();
    try {
      const u: any | null = await prisma.unit.findFirst({ where: { id, userId } });
      if (!u) return null;
      return {
        ...u,
        propertyId: u.propertyId ?? undefined,
        area: u.area ?? undefined,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    } catch (err) {
      if (tableMissing(err)) return null;
      throw err;
    }
  },

  async create(userId: string, data: { propertyId?: string | null; unitNumber?: string | null; name?: string | null; rent?: number | null; area?: number | null }) {
    const prisma = getPrismaClient();
    try {
      const created = await prisma.unit.create({
        data: {
          userId,
          propertyId: data.propertyId ?? null,
          unitNumber: data.unitNumber ?? null,
          name: data.name ?? null,
          rent: data.rent ?? null,
          area: data.area ?? null,
        },
      });
      return {
        ...created,
        propertyId: created.propertyId ?? undefined,
        area: created.area ?? undefined,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      if (tableMissing(err)) throw new Error('Units table not found: run prisma migrate and prisma generate before using Unit service');
      throw err;
    }
  },
};

export const leaseService = {
  async getAll(userId: string) {
    const prisma = getPrismaClient();
    try {
      const leases = await prisma.lease.findMany({ where: { userId }, include: { unit: true, tenant: true } });
      return leases.map((l: any) => ({
        ...l,
        startDate: l.startDate.toISOString().split('T')[0],
        endDate: l.endDate.toISOString().split('T')[0],
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        unit: l.unit ? { ...l.unit, createdAt: l.unit.createdAt.toISOString(), updatedAt: l.unit.updatedAt.toISOString() } : undefined,
        tenant: l.tenant ? { ...l.tenant, leaseStart: l.tenant.leaseStart.toISOString().split('T')[0], leaseEnd: l.tenant.leaseEnd.toISOString().split('T')[0] } : undefined,
      }));
    } catch (err) {
      if (tableMissing(err)) return [];
      throw err;
    }
  },

  async getById(userId: string, id: string) {
    const prisma = getPrismaClient();
    try {
      const l: any | null = await prisma.lease.findFirst({ where: { id, userId }, include: { unit: true, tenant: true } });
      if (!l) return null;
      return {
        ...l,
        startDate: l.startDate.toISOString().split('T')[0],
        endDate: l.endDate.toISOString().split('T')[0],
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        unit: l.unit ? { ...l.unit, createdAt: l.unit.createdAt.toISOString(), updatedAt: l.unit.updatedAt.toISOString() } : undefined,
        tenant: l.tenant ? { ...l.tenant, leaseStart: l.tenant.leaseStart.toISOString().split('T')[0], leaseEnd: l.tenant.leaseEnd.toISOString().split('T')[0] } : undefined,
      };
    } catch (err) {
      if (tableMissing(err)) return null;
      throw err;
    }
  },

  async create(userId: string, data: { unitId: string; tenantId: string; startDate: string; endDate: string; rent: number }) {
    const prisma = getPrismaClient();
    try {
      const created = await prisma.lease.create({
        data: {
          userId,
          unitId: data.unitId,
          tenantId: data.tenantId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          rent: data.rent,
        },
        include: { unit: true, tenant: true },
      });
      return {
        ...created,
        startDate: created.startDate.toISOString().split('T')[0],
        endDate: created.endDate.toISOString().split('T')[0],
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        unit: created.unit ? { ...created.unit, createdAt: created.unit.createdAt.toISOString(), updatedAt: created.unit.updatedAt.toISOString() } : undefined,
        tenant: created.tenant ? { ...created.tenant, leaseStart: created.tenant.leaseStart.toISOString().split('T')[0], leaseEnd: created.tenant.leaseEnd.toISOString().split('T')[0] } : undefined,
      };
    } catch (err) {
      if (tableMissing(err)) throw new Error('Leases table not found: run prisma migrate and prisma generate before using Lease service');
      throw err;
    }
  },
};
