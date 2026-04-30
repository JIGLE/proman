import { getPrismaClient } from "../database";
import { Tenant } from "@/lib/types";

export const tenantService = {
  async getAll(userId: string): Promise<Tenant[]> {
    const tenants = await getPrismaClient().tenant.findMany({
      where: { userId },
      include: { property: true, receipts: true, correspondences: true },
    });
    return tenants.map((t) => ({
      ...t,
      leaseStart: t.leaseStart.toISOString().split("T")[0],
      leaseEnd: t.leaseEnd.toISOString().split("T")[0],
      propertyId: t.propertyId || undefined,
      lastPayment: t.lastPayment?.toISOString(),
      notes: t.notes || undefined,
      propertyName: t.property?.name,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  },

  async getById(userId: string, id: string): Promise<Tenant | null> {
    const tenant = await getPrismaClient().tenant.findFirst({
      where: { id, userId },
      include: { property: true, receipts: true, correspondences: true },
    });
    if (!tenant) return null;
    return {
      ...tenant,
      propertyId: tenant.propertyId || undefined,
      leaseStart: tenant.leaseStart.toISOString().split("T")[0],
      leaseEnd: tenant.leaseEnd.toISOString().split("T")[0],
      lastPayment: tenant.lastPayment?.toISOString(),
      notes: tenant.notes || undefined,
      propertyName: tenant.property?.name,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },

  async create(
    userId: string,
    data: Omit<Tenant, "id" | "userId" | "createdAt" | "updatedAt" | "propertyName">,
  ): Promise<Tenant> {
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
      leaseStart: tenant.leaseStart.toISOString().split("T")[0],
      leaseEnd: tenant.leaseEnd.toISOString().split("T")[0],
      lastPayment: tenant.lastPayment?.toISOString(),
      notes: tenant.notes || undefined,
      propertyName: tenant.property?.name,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  },

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<Tenant, "id" | "userId" | "createdAt" | "updatedAt" | "propertyName">>,
  ): Promise<Tenant> {
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
      leaseStart: tenant.leaseStart.toISOString().split("T")[0],
      leaseEnd: tenant.leaseEnd.toISOString().split("T")[0],
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
