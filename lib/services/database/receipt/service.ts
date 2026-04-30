import { getPrismaClient } from "../database";
import { Receipt } from "@/lib/types";

export const receiptService = {
  async getAll(userId: string): Promise<Receipt[]> {
    const receipts = await getPrismaClient().receipt.findMany({
      where: { userId },
      include: { tenant: true, property: true },
    });
    return receipts.map((r) => ({
      ...r,
      description: r.description || undefined,
      date: r.date.toISOString().split("T")[0],
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
      date: receipt.date.toISOString().split("T")[0],
      tenantName: receipt.tenant.name,
      propertyName: receipt.property.name,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  },

  async create(
    userId: string,
    data: Omit<
      Receipt,
      "id" | "userId" | "createdAt" | "updatedAt" | "tenantName" | "propertyName"
    >,
  ): Promise<Receipt> {
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
      date: receipt.date.toISOString().split("T")[0],
      tenantName: receipt.tenant.name,
      propertyName: receipt.property.name,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  },

  async update(
    userId: string,
    id: string,
    data: Partial<
      Omit<Receipt, "id" | "userId" | "createdAt" | "updatedAt" | "tenantName" | "propertyName">
    >,
  ): Promise<Receipt> {
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
      date: receipt.date.toISOString().split("T")[0],
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
