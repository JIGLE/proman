import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The sibling app/api/maintenance/maintenance.test.ts never imports a route handler — its
 * cases assert on object literals they build inline, so nothing there exercises this code.
 * These do: PUT is driven end to end, pinning that an invalid enum is a 400 rather than the
 * 500 the bare partialSchema.parse() used to produce via withErrorHandler.
 */

const { requireAuthMock, prismaMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  prismaMock: {
    maintenanceTicket: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));

import { PUT } from "./route";

const putRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/maintenance/ticket-1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const context = { params: { id: "ticket-1" } };

describe("PUT /api/maintenance/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    prismaMock.maintenanceTicket.findFirst.mockResolvedValue({ id: "ticket-1", status: "open" });
    prismaMock.maintenanceTicket.update.mockResolvedValue({
      id: "ticket-1",
      status: "in_progress",
      property: { name: "Rua Augusta 12" },
    });
  });

  it("applies a valid partial update", async () => {
    const res = await PUT(putRequest({ status: "in_progress" }), context);

    expect(res.status).toBe(200);
    expect(prismaMock.maintenanceTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1" },
        data: expect.objectContaining({ status: "in_progress" }),
      }),
    );
  });

  it("returns 400 for a status outside the allowed set", async () => {
    const res = await PUT(putRequest({ status: "banana" }), context);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringContaining("Validation error") }),
    );
    expect(prismaMock.maintenanceTicket.update).not.toHaveBeenCalled();
  });

  it("returns 400 for a negative cost", async () => {
    const res = await PUT(putRequest({ estimatedCost: -50 }), context);

    expect(res.status).toBe(400);
    expect(prismaMock.maintenanceTicket.update).not.toHaveBeenCalled();
  });

  it("still 404s for a ticket belonging to someone else", async () => {
    // Scoping is checked before validation, and must stay that way — a bad body on a
    // ticket you don't own should not reveal that the ticket exists.
    prismaMock.maintenanceTicket.findFirst.mockResolvedValue(null);

    const res = await PUT(putRequest({ status: "banana" }), context);

    expect(res.status).toBe(404);
  });
});
