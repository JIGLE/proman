import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Regression tests for a cross-tenant IDOR. This route looked contacts up by id alone, with no
 * reference to userId anywhere in the file, so any signed-in user could read, edit or delete
 * another landlord's contractor records. proxy.ts gates /api/** behind a session but only checks
 * that one exists, never whose.
 *
 * Each write case asserts the mutation was NOT attempted, not merely that the status was 404 —
 * a handler that returned 404 after already writing would satisfy the status assertion alone.
 */

const { requireAuthMock, prismaMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  prismaMock: {
    maintenanceContact: {
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

import { GET, PUT, DELETE } from "./route";

const params = Promise.resolve({ id: "contact-1" });

const request = (method: string, body?: unknown) =>
  new NextRequest("http://localhost:3000/api/contacts/contact-1", {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });

const contact = {
  id: "contact-1",
  userId: "user-123",
  contactPerson: "Sofia Marques",
  type: "contractor",
  email: "sofia@example.pt",
  hourlyRate: 45,
};

describe("/api/contacts/[id] — tenant scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    prismaMock.maintenanceContact.findFirst.mockResolvedValue(contact);
    prismaMock.maintenanceContact.update.mockResolvedValue(contact);
    prismaMock.maintenanceContact.delete.mockResolvedValue(contact);
  });

  describe("GET", () => {
    it("returns the caller's own contact", async () => {
      const res = await GET(request("GET"), { params });

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({
        data: expect.objectContaining({ id: "contact-1" }),
      });
    });

    it("scopes the lookup to the caller rather than fetching by id alone", async () => {
      await GET(request("GET"), { params });

      expect(prismaMock.maintenanceContact.findFirst).toHaveBeenCalledWith({
        where: { id: "contact-1", userId: "user-123" },
      });
    });

    it("returns 404 for a contact belonging to another user", async () => {
      // The scoped query simply finds nothing — same response as a contact that never existed,
      // so a guessed id is not confirmed.
      prismaMock.maintenanceContact.findFirst.mockResolvedValue(null);

      const res = await GET(request("GET"), { params });

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Contact not found" });
    });
  });

  describe("PUT", () => {
    it("updates the caller's own contact", async () => {
      const res = await PUT(request("PUT", { name: "Sofia Marques", type: "contractor" }), {
        params,
      });

      expect(res.status).toBe(200);
      expect(prismaMock.maintenanceContact.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "contact-1" } }),
      );
    });

    it("does not write to another user's contact", async () => {
      prismaMock.maintenanceContact.findFirst.mockResolvedValue(null);

      const res = await PUT(request("PUT", { name: "Hijacked", type: "contractor" }), { params });

      expect(res.status).toBe(404);
      expect(prismaMock.maintenanceContact.update).not.toHaveBeenCalled();
    });

    it("checks ownership before reading the body, so a malformed payload cannot mask the guard", async () => {
      prismaMock.maintenanceContact.findFirst.mockResolvedValue(null);

      const res = await PUT(request("PUT"), { params });

      expect(res.status).toBe(404);
      expect(prismaMock.maintenanceContact.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("deletes the caller's own contact", async () => {
      const res = await DELETE(request("DELETE"), { params });

      expect(res.status).toBe(200);
      expect(prismaMock.maintenanceContact.delete).toHaveBeenCalledWith({
        where: { id: "contact-1" },
      });
      await expect(res.json()).resolves.toEqual({ success: true });
    });

    it("does not delete another user's contact", async () => {
      prismaMock.maintenanceContact.findFirst.mockResolvedValue(null);

      const res = await DELETE(request("DELETE"), { params });

      expect(res.status).toBe(404);
      expect(prismaMock.maintenanceContact.delete).not.toHaveBeenCalled();
    });
  });
});
