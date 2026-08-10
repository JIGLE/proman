import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { ForbiddenError, ResourceNotFoundError } from "@/lib/utils/error-handling";

/**
 * Before scoping, this route fetched by id alone: any signed-in landlord could read, edit or
 * delete a template every other landlord was using. These pin the two refusals and, crucially,
 * that neither one writes.
 */

const { requireAuthMock, templateServiceMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  templateServiceMock: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/services/auth/auth-middleware", () => ({
  requireAuth: requireAuthMock,
  handleOptions: vi.fn(),
}));
vi.mock("@/lib/services/database/correspondence", () => ({
  templateService: templateServiceMock,
}));

import { GET, PUT, DELETE } from "./route";

const context = { params: Promise.resolve({ id: "tpl-1" }) };

const request = (method: string, body?: unknown) =>
  new NextRequest("http://localhost:3000/api/correspondence/templates/tpl-1", {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });

const template = {
  id: "tpl-1",
  name: "Rent reminder",
  type: "rent_reminder",
  subject: "Rent due",
  content: "Dear {{tenant_name}}",
  variables: ["tenant_name"],
  isSystem: false,
  version: 1,
};

describe("/api/correspondence/templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: "user-123" });
    templateServiceMock.getById.mockResolvedValue(template);
    templateServiceMock.update.mockResolvedValue({ ...template, name: "Renamed" });
    templateServiceMock.delete.mockResolvedValue(undefined);
  });

  describe("GET", () => {
    it("scopes the lookup to the caller", async () => {
      const res = await GET(request("GET"), context);

      expect(res.status).toBe(200);
      expect(templateServiceMock.getById).toHaveBeenCalledWith("user-123", "tpl-1");
    });

    it("returns 404 for a template the caller cannot see", async () => {
      templateServiceMock.getById.mockResolvedValue(null);

      const res = await GET(request("GET"), context);

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Template not found" });
    });
  });

  describe("PUT", () => {
    it("updates the caller's own template", async () => {
      const res = await PUT(request("PUT", { name: "Renamed" }), context);

      expect(res.status).toBe(200);
      expect(templateServiceMock.update).toHaveBeenCalledWith("user-123", "tpl-1", {
        name: "Renamed",
      });
    });

    it("refuses a system template with 403 and tells the caller to copy it", async () => {
      templateServiceMock.update.mockRejectedValue(
        new ForbiddenError("System templates cannot be edited. Copy it first, then edit the copy."),
      );

      const res = await PUT(request("PUT", { name: "Tampered" }), context);

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual(
        expect.objectContaining({ error: expect.stringContaining("Copy it first") }),
      );
    });

    it("returns 404 for another user's template", async () => {
      templateServiceMock.update.mockRejectedValue(new ResourceNotFoundError("Template"));

      const res = await PUT(request("PUT", { name: "Tampered" }), context);

      expect(res.status).toBe(404);
    });

    it("returns 400 for a malformed body without attempting a write", async () => {
      const res = await PUT(request("PUT", { name: "" }), context);

      expect(res.status).toBe(400);
      expect(templateServiceMock.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("deletes the caller's own template", async () => {
      const res = await DELETE(request("DELETE"), context);

      expect(res.status).toBe(200);
      expect(templateServiceMock.delete).toHaveBeenCalledWith("user-123", "tpl-1");
    });

    it("refuses to delete a system template", async () => {
      templateServiceMock.delete.mockRejectedValue(
        new ForbiddenError("System templates cannot be edited. Copy it first, then edit the copy."),
      );

      const res = await DELETE(request("DELETE"), context);

      expect(res.status).toBe(403);
    });

    it("returns 404 for another user's template", async () => {
      templateServiceMock.delete.mockRejectedValue(new ResourceNotFoundError("Template"));

      const res = await DELETE(request("DELETE"), context);

      expect(res.status).toBe(404);
    });
  });
});
