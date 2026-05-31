import { getPrismaClient } from "../database";
import { Correspondence, CorrespondenceTemplate } from "@/lib/types";

export const templateService = {
  async getAll(): Promise<CorrespondenceTemplate[]> {
    const templates = await getPrismaClient().correspondenceTemplate.findMany({
      include: { correspondences: true },
    });
    return templates.map((t) => ({
      ...t,
      variables: JSON.parse(t.variables),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  },

  async getById(id: string): Promise<CorrespondenceTemplate | null> {
    const template = await getPrismaClient().correspondenceTemplate.findUnique({
      where: { id },
      include: { correspondences: true },
    });
    if (!template) return null;
    return {
      ...template,
      variables: JSON.parse(template.variables),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  },

  async create(
    data: Omit<CorrespondenceTemplate, "id" | "createdAt" | "updatedAt">,
  ): Promise<CorrespondenceTemplate> {
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

  async update(
    id: string,
    data: Partial<Omit<CorrespondenceTemplate, "id" | "createdAt" | "updatedAt">>,
  ): Promise<CorrespondenceTemplate> {
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

export const correspondenceService = {
  async getAll(userId: string): Promise<Correspondence[]> {
    const correspondence = await getPrismaClient().correspondence.findMany({
      where: { userId },
      include: { template: true, tenant: true },
    });
    return correspondence.map((c) => ({
      ...c,
      propertyId: (c as unknown as { propertyId: string | null }).propertyId ?? undefined,
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
      propertyId:
        (correspondenceData as unknown as { propertyId: string | null }).propertyId ?? undefined,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async create(
    userId: string,
    data: Omit<Correspondence, "id" | "userId" | "createdAt" | "updatedAt" | "tenantName">,
  ): Promise<Correspondence> {
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
      propertyId:
        (correspondenceData as unknown as { propertyId: string | null }).propertyId ?? undefined,
      tenantName: correspondence.tenant.name,
      sentAt: correspondence.sentAt?.toISOString(),
      createdAt: correspondence.createdAt.toISOString(),
      updatedAt: correspondence.updatedAt.toISOString(),
    };
  },

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<Correspondence, "id" | "userId" | "createdAt" | "updatedAt" | "tenantName">>,
  ): Promise<Correspondence> {
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
      propertyId:
        (correspondenceData as unknown as { propertyId: string | null }).propertyId ?? undefined,
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
