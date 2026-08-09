import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The route these cover did not exist until now — `property-detail-view.tsx` had been posting to
 * it since 2026-07-19, so assigning or removing a property owner 404'd. The cases below pin the
 * parts that are easy to get wrong: the cross-user scoping, and the 100% cap, which the client
 * checks but cannot enforce.
 */

const { requireAuthMock, logAuditMock, prismaMock } = vi.hoisted(() => {
  const prisma = {
    property: { findFirst: vi.fn() },
    owner: { findFirst: vi.fn() },
    propertyOwner: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { requireAuthMock: vi.fn(), logAuditMock: vi.fn(), prismaMock: prisma };
});

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/audit-log", () => ({ logAudit: logAuditMock }));
vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/config/data-mode", () => ({ isMockMode: false }));

import { POST, DELETE } from "./route";

const postRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/property-owners", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const deleteRequest = (qs: string) =>
  new NextRequest(`http://localhost:3000/api/property-owners?${qs}`, { method: "DELETE" });

describe("POST /api/property-owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    logAuditMock.mockResolvedValue(undefined);
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop-1" });
    prismaMock.owner.findFirst.mockResolvedValue({ id: "owner-1", name: "Ana Costa" });
    prismaMock.propertyOwner.findMany.mockResolvedValue([]);
    prismaMock.propertyOwner.upsert.mockResolvedValue({
      id: "po-1",
      propertyId: "prop-1",
      ownerId: "owner-1",
      ownershipPercentage: 40,
    });
  });

  it("assigns an owner and records an audit entry", async () => {
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: 40 }),
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ data: expect.objectContaining({ id: "po-1" }) });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123", action: "ASSIGN_PROPERTY_OWNER" }),
    );
  });

  it("scopes the property to the caller", async () => {
    await POST(postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: 40 }));
    expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prop-1", userId: "user-123" } }),
    );
  });

  it("404s on another user's property rather than attaching to it", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null);
    const res = await POST(
      postRequest({ propertyId: "someone-elses", ownerId: "owner-1", ownershipPercentage: 40 }),
    );
    expect(res.status).toBe(404);
    expect(prismaMock.propertyOwner.upsert).not.toHaveBeenCalled();
  });

  it("404s on another user's owner", async () => {
    prismaMock.owner.findFirst.mockResolvedValue(null);
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "someone-elses", ownershipPercentage: 40 }),
    );
    expect(res.status).toBe(404);
    expect(prismaMock.propertyOwner.upsert).not.toHaveBeenCalled();
  });

  it("rejects a share that pushes the property past 100%", async () => {
    prismaMock.propertyOwner.findMany.mockResolvedValue([
      { ownershipPercentage: 60 },
      { ownershipPercentage: 25 },
    ]);
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: 20 }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/exceeds 100%/);
    expect(prismaMock.propertyOwner.upsert).not.toHaveBeenCalled();
  });

  it("allows a share that lands exactly on 100%", async () => {
    prismaMock.propertyOwner.findMany.mockResolvedValue([{ ownershipPercentage: 70 }]);
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: 30 }),
    );
    expect(res.status).toBe(201);
  });

  it("excludes the owner's own current share, so re-assigning replaces rather than adds", async () => {
    // Ana already holds 60%. Moving her to 80% must not read as 60 + 80 = 140%.
    prismaMock.propertyOwner.findMany.mockResolvedValue([]);
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: 80 }),
    );

    expect(res.status).toBe(201);
    expect(prismaMock.propertyOwner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { propertyId: "prop-1", ownerId: { not: "owner-1" } } }),
    );
    expect(prismaMock.propertyOwner.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { propertyId_ownerId: { propertyId: "prop-1", ownerId: "owner-1" } },
      }),
    );
  });

  it.each([
    ["zero", 0],
    ["negative", -10],
    ["above 100", 140],
  ])("rejects a %s percentage", async (_label, pct) => {
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: pct }),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.propertyOwner.upsert).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    requireAuthMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const res = await POST(
      postRequest({ propertyId: "prop-1", ownerId: "owner-1", ownershipPercentage: 40 }),
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/property-owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    logAuditMock.mockResolvedValue(undefined);
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop-1" });
    prismaMock.propertyOwner.findUnique.mockResolvedValue({ id: "po-1", ownershipPercentage: 40 });
    prismaMock.propertyOwner.delete.mockResolvedValue({ id: "po-1" });
  });

  it("removes the assignment and records an audit entry", async () => {
    const res = await DELETE(deleteRequest("propertyId=prop-1&ownerId=owner-1"));

    expect(res.status).toBe(200);
    expect(prismaMock.propertyOwner.delete).toHaveBeenCalledWith({ where: { id: "po-1" } });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REMOVE_PROPERTY_OWNER" }),
    );
  });

  it("404s on another user's property", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null);
    const res = await DELETE(deleteRequest("propertyId=someone-elses&ownerId=owner-1"));
    expect(res.status).toBe(404);
    expect(prismaMock.propertyOwner.delete).not.toHaveBeenCalled();
  });

  it("404s when the owner is not assigned to the property", async () => {
    prismaMock.propertyOwner.findUnique.mockResolvedValue(null);
    const res = await DELETE(deleteRequest("propertyId=prop-1&ownerId=owner-9"));
    expect(res.status).toBe(404);
    expect(prismaMock.propertyOwner.delete).not.toHaveBeenCalled();
  });

  it("400s when the query parameters are missing", async () => {
    const res = await DELETE(deleteRequest("propertyId=prop-1"));
    expect(res.status).toBe(400);
    expect(prismaMock.propertyOwner.delete).not.toHaveBeenCalled();
  });
});
