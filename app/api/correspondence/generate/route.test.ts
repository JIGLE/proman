import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Generating correspondence used to take every substitution value straight from the request body,
 * so the rent figure in a letter was whatever the client posted rather than what the tenancy
 * record said. For anything with legal weight the number IS the operative content.
 *
 * The first test below is the one that matters: a caller-supplied {{rent_amount}} must lose to the
 * server-derived one. The rest pin scoping and the provenance snapshot.
 */

const { requireAuthMock, templateServiceMock, correspondenceServiceMock, prismaMock } = vi.hoisted(
  () => ({
    requireAuthMock: vi.fn(),
    templateServiceMock: { getById: vi.fn() },
    correspondenceServiceMock: { create: vi.fn() },
    prismaMock: { tenant: { findFirst: vi.fn() } },
  }),
);

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/database/correspondence", () => ({
  templateService: templateServiceMock,
  correspondenceService: correspondenceServiceMock,
}));
vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));

import { POST } from "./route";

const generate = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/correspondence/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const tenantRecord = {
  id: "tenant-1",
  userId: "user-123",
  name: "Ana Costa",
  email: "ana@example.pt",
  rent: 950,
  leaseStart: new Date("2026-01-01"),
  leaseEnd: new Date("2026-12-31"),
  property: {
    name: "Rua Augusta 12",
    address: "Rua Augusta 12, Lisboa",
    city: "Lisboa",
    bedrooms: 2,
    bathrooms: 1,
  },
  leases: [
    {
      monthlyRent: 950,
      deposit: 1900,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  ],
};

describe("POST /api/correspondence/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    prismaMock.tenant.findFirst.mockResolvedValue(tenantRecord);
    templateServiceMock.getById.mockResolvedValue({
      id: "tpl-1",
      name: "Rent reminder",
      type: "rent_reminder",
      subject: "Rent due for {{property_name}}",
      content: "Dear {{tenant_name}}, your rent of {{rent_amount}} is due.",
      version: 4,
      isSystem: true,
    });
    correspondenceServiceMock.create.mockImplementation(
      async (_userId: string, data: Record<string, unknown>) => ({ id: "corr-1", ...data }),
    );
  });

  it("ignores a caller-supplied rent amount in favour of the tenancy record", async () => {
    const res = await POST(
      generate({
        templateId: "tpl-1",
        tenantId: "tenant-1",
        variables: { "{{rent_amount}}": "1.00" },
      }),
    );

    expect(res.status).toBe(201);
    const [, created] = correspondenceServiceMock.create.mock.calls[0];
    expect(created.content).not.toContain("1.00");
    expect(created.content).toContain("950");
  });

  it("still accepts caller values for keys the server cannot know", async () => {
    templateServiceMock.getById.mockResolvedValue({
      id: "tpl-1",
      name: "Rent reminder",
      subject: "s",
      content: "Due on {{due_date}}",
      version: 1,
      isSystem: false,
    });

    await POST(
      generate({
        templateId: "tpl-1",
        tenantId: "tenant-1",
        variables: { "{{due_date}}": "2026-04-08" },
      }),
    );

    const [, created] = correspondenceServiceMock.create.mock.calls[0];
    expect(created.content).toContain("2026-04-08");
  });

  it("fills tenant and property facts from the record", async () => {
    await POST(generate({ templateId: "tpl-1", tenantId: "tenant-1" }));

    const [, created] = correspondenceServiceMock.create.mock.calls[0];
    expect(created.content).toContain("Ana Costa");
    expect(created.subject).toContain("Rua Augusta 12");
  });

  it("derives the tenant scoped to the caller, not by id alone", async () => {
    await POST(generate({ templateId: "tpl-1", tenantId: "tenant-1" }));

    expect(prismaMock.tenant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tenant-1", userId: "user-123" },
      }),
    );
  });

  it("snapshots which template and version the wording came from", async () => {
    await POST(generate({ templateId: "tpl-1", tenantId: "tenant-1" }));

    const [, created] = correspondenceServiceMock.create.mock.calls[0];
    expect(created).toMatchObject({
      templateNameSnapshot: "Rent reminder",
      templateVersionSnapshot: 4,
      // Rendered from a locked statutory template, so liability stayed with the product.
      templateOriginSnapshot: "system",
    });
  });

  it("records a user-owned template as user-origin", async () => {
    templateServiceMock.getById.mockResolvedValue({
      id: "tpl-2",
      name: "My reminder",
      subject: "s",
      content: "c",
      version: 2,
      isSystem: false,
    });

    await POST(generate({ templateId: "tpl-2", tenantId: "tenant-1" }));

    const [, created] = correspondenceServiceMock.create.mock.calls[0];
    expect(created.templateOriginSnapshot).toBe("user");
  });

  it("scopes the template lookup to the caller", async () => {
    await POST(generate({ templateId: "tpl-1", tenantId: "tenant-1" }));

    expect(templateServiceMock.getById).toHaveBeenCalledWith("user-123", "tpl-1");
  });

  it("returns 404 for a template the caller cannot see, without creating anything", async () => {
    templateServiceMock.getById.mockResolvedValue(null);

    const res = await POST(generate({ templateId: "tpl-other", tenantId: "tenant-1" }));

    expect(res.status).toBe(404);
    expect(correspondenceServiceMock.create).not.toHaveBeenCalled();
  });
});
