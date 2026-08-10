import { getPrismaClient } from "../database";
import { Correspondence, CorrespondenceTemplate } from "@/lib/types";
import { ForbiddenError, ResourceNotFoundError } from "@/lib/utils/error-handling";

/**
 * Templates come in two ownerships, and the difference carries legal weight.
 *
 * `userId === null` is a **system template**: shipped with the product, readable by every user,
 * editable by none. Statutory instruments live here because their wording carries professional
 * liability that only a qualified reviewer can accept.
 *
 * `userId === <someone>` is that user's own copy, private to them, theirs to change. A user
 * arrives here by calling `copyForUser`, and that copy is the moment responsibility for the words
 * transfers — which is why the fork records where it came from and at which version.
 *
 * Every method takes the caller's id first, matching propertyService/tenantService/receiptService.
 */

type TemplateRow = Awaited<
  ReturnType<ReturnType<typeof getPrismaClient>["correspondenceTemplate"]["findFirstOrThrow"]>
>;

function toTemplate(row: TemplateRow): CorrespondenceTemplate {
  return {
    ...row,
    variables: JSON.parse(row.variables),
    isSystem: row.userId === null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as CorrespondenceTemplate;
}

/** The caller's own templates plus the system ones. Never anybody else's. */
function visibleTo(userId: string) {
  return { OR: [{ userId }, { userId: null }] };
}

export const templateService = {
  async getAll(userId: string): Promise<CorrespondenceTemplate[]> {
    const templates = await getPrismaClient().correspondenceTemplate.findMany({
      where: visibleTo(userId),
      orderBy: [{ userId: "asc" }, { name: "asc" }],
    });
    return templates.map(toTemplate);
  },

  async getById(userId: string, id: string): Promise<CorrespondenceTemplate | null> {
    const template = await getPrismaClient().correspondenceTemplate.findFirst({
      where: { id, ...visibleTo(userId) },
    });
    return template ? toTemplate(template) : null;
  },

  async create(
    userId: string,
    data: Omit<CorrespondenceTemplate, "id" | "createdAt" | "updatedAt">,
  ): Promise<CorrespondenceTemplate> {
    const template = await getPrismaClient().correspondenceTemplate.create({
      data: {
        // Always stamped from the session. A caller cannot mint a system template by omitting it.
        userId,
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables: JSON.stringify(data.variables),
        country: data.country ?? null,
        locale: data.locale ?? null,
      },
    });
    return toTemplate(template);
  },

  /**
   * Fork a template the caller can see into one they own. This is the liability boundary: the copy
   * records which instrument it descended from and at which version it stopped being ours.
   */
  async copyForUser(userId: string, id: string): Promise<CorrespondenceTemplate> {
    const source = await getPrismaClient().correspondenceTemplate.findFirst({
      where: { id, ...visibleTo(userId) },
    });
    if (!source) throw new ResourceNotFoundError("Template");

    const copy = await getPrismaClient().correspondenceTemplate.create({
      data: {
        userId,
        name: `${source.name} (copy)`,
        type: source.type,
        subject: source.subject,
        content: source.content,
        variables: source.variables,
        country: source.country,
        locale: source.locale,
        derivedFromId: source.id,
        derivedFromVersion: source.version,
      },
    });
    return toTemplate(copy);
  },

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<CorrespondenceTemplate, "id" | "createdAt" | "updatedAt">>,
  ): Promise<CorrespondenceTemplate> {
    await assertOwned(userId, id);

    const template = await getPrismaClient().correspondenceTemplate.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables: data.variables ? JSON.stringify(data.variables) : undefined,
        country: data.country,
        locale: data.locale,
        // Sent letters pin the version they rendered from, so bumping here keeps "which words
        // went out" answerable after the template moves on.
        version: { increment: 1 },
      },
    });
    return toTemplate(template);
  },

  async delete(userId: string, id: string): Promise<void> {
    await assertOwned(userId, id);
    await getPrismaClient().correspondenceTemplate.delete({ where: { id } });
  },
};

/**
 * Throws unless the template exists, is visible to the caller, and is theirs to modify.
 * Distinguishes the two refusals deliberately: 404 for something they cannot see, 403 for a system
 * template they can read but must copy before changing — the second is actionable advice.
 */
async function assertOwned(userId: string, id: string): Promise<void> {
  const existing = await getPrismaClient().correspondenceTemplate.findFirst({
    where: { id, ...visibleTo(userId) },
    select: { userId: true },
  });
  if (!existing) throw new ResourceNotFoundError("Template");
  if (existing.userId === null) {
    throw new ForbiddenError(
      "System templates cannot be edited. Copy it first, then edit the copy.",
    );
  }
}

/**
 * SQLite has no enums, so Prisma types the origin column as a bare string. Narrow it once here
 * rather than widening the domain type — "system" or "user" is a distinction the UI and any future
 * liability report both need to rely on.
 */
function narrowOrigin(value: string | null): "system" | "user" | null {
  return value === "system" || value === "user" ? value : null;
}

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
      templateOriginSnapshot: narrowOrigin(c.templateOriginSnapshot),
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
      templateOriginSnapshot: narrowOrigin(correspondence.templateOriginSnapshot),
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
        // Provenance, captured once at render time. These outlive the template itself, so a
        // served letter stays provable after the template is edited, forked or deleted.
        templateNameSnapshot: data.templateNameSnapshot ?? null,
        templateVersionSnapshot: data.templateVersionSnapshot ?? null,
        templateOriginSnapshot: data.templateOriginSnapshot ?? null,
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
      templateOriginSnapshot: narrowOrigin(correspondence.templateOriginSnapshot),
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
      templateOriginSnapshot: narrowOrigin(correspondence.templateOriginSnapshot),
    };
  },

  async delete(userId: string, id: string): Promise<void> {
    await getPrismaClient().correspondence.delete({ where: { id, userId } });
  },
};
