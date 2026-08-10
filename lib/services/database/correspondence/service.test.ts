import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Templates were global: no owner column, so getAll() returned every landlord's and any signed-in
 * user could edit or delete a template the rest of the instance was using.
 *
 * These pin the ownership rules that replaced that — and in particular the distinction the whole
 * liability model rests on: a system template can be read by everyone and changed by nobody, and
 * the only way to a modifiable version is an explicit copy that records where it came from.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    correspondenceTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../database", () => ({ getPrismaClient: () => prismaMock }));

import { templateService } from "./service";

const row = (over: Record<string, unknown> = {}) => ({
  id: "tpl-1",
  userId: "user-123",
  name: "Rent reminder",
  type: "rent_reminder",
  subject: "Rent due",
  content: "Dear {{tenant_name}}",
  variables: JSON.stringify(["tenant_name"]),
  country: "PT",
  locale: "pt-PT",
  version: 3,
  derivedFromId: null,
  derivedFromVersion: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...over,
});

const systemRow = (over: Record<string, unknown> = {}) => row({ userId: null, ...over });

describe("templateService ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("visibility", () => {
    it("lists the caller's own templates and the system ones, and nobody else's", async () => {
      prismaMock.correspondenceTemplate.findMany.mockResolvedValue([row(), systemRow()]);

      await templateService.getAll("user-123");

      expect(prismaMock.correspondenceTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ userId: "user-123" }, { userId: null }] },
        }),
      );
    });

    it("marks a template with no owner as a system template", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(systemRow());

      const template = await templateService.getById("user-123", "tpl-1");

      expect(template?.isSystem).toBe(true);
    });

    it("marks an owned template as not a system template", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(row());

      const template = await templateService.getById("user-123", "tpl-1");

      expect(template?.isSystem).toBe(false);
    });

    it("returns null for a template belonging to someone else", async () => {
      // The scoped query finds nothing — indistinguishable from a template that never existed.
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(null);

      await expect(templateService.getById("user-123", "tpl-other")).resolves.toBeNull();
    });
  });

  describe("create", () => {
    it("stamps the caller as owner so nobody can mint a system template", async () => {
      prismaMock.correspondenceTemplate.create.mockResolvedValue(row());

      await templateService.create("user-123", {
        name: "Mine",
        type: "custom",
        subject: "s",
        content: "c",
        variables: [],
        // A caller trying to smuggle in system ownership must not succeed.
        userId: null,
      } as never);

      expect(prismaMock.correspondenceTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: "user-123" }) }),
      );
    });
  });

  describe("update", () => {
    it("refuses to edit a system template and does not write", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue({ userId: null });

      await expect(templateService.update("user-123", "tpl-1", { name: "x" })).rejects.toThrow(
        /copy it first/i,
      );
      expect(prismaMock.correspondenceTemplate.update).not.toHaveBeenCalled();
    });

    it("refuses to edit a template the caller cannot see, and does not write", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(null);

      await expect(templateService.update("user-123", "tpl-1", { name: "x" })).rejects.toThrow(
        /not found/i,
      );
      expect(prismaMock.correspondenceTemplate.update).not.toHaveBeenCalled();
    });

    it("bumps the version so sent letters stay attributable to the wording they used", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue({ userId: "user-123" });
      prismaMock.correspondenceTemplate.update.mockResolvedValue(row({ version: 4 }));

      await templateService.update("user-123", "tpl-1", { name: "Renamed" });

      expect(prismaMock.correspondenceTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: { increment: 1 } }),
        }),
      );
    });
  });

  describe("delete", () => {
    it("refuses to delete a system template and does not write", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue({ userId: null });

      await expect(templateService.delete("user-123", "tpl-1")).rejects.toThrow(/copy it first/i);
      expect(prismaMock.correspondenceTemplate.delete).not.toHaveBeenCalled();
    });

    it("refuses to delete another user's template and does not write", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(null);

      await expect(templateService.delete("user-123", "tpl-1")).rejects.toThrow(/not found/i);
      expect(prismaMock.correspondenceTemplate.delete).not.toHaveBeenCalled();
    });
  });

  describe("copyForUser — the liability boundary", () => {
    it("records which template the copy descended from, and at which version", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(
        systemRow({ id: "tpl-statutory", version: 7 }),
      );
      prismaMock.correspondenceTemplate.create.mockResolvedValue(row({ id: "tpl-copy" }));

      await templateService.copyForUser("user-123", "tpl-statutory");

      expect(prismaMock.correspondenceTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            derivedFromId: "tpl-statutory",
            derivedFromVersion: 7,
          }),
        }),
      );
    });

    it("carries the jurisdiction and language across, so a PT notice stays a PT notice", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(systemRow());
      prismaMock.correspondenceTemplate.create.mockResolvedValue(row());

      await templateService.copyForUser("user-123", "tpl-1");

      expect(prismaMock.correspondenceTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ country: "PT", locale: "pt-PT" }),
        }),
      );
    });

    it("will not copy a template the caller cannot see", async () => {
      prismaMock.correspondenceTemplate.findFirst.mockResolvedValue(null);

      await expect(templateService.copyForUser("user-123", "tpl-other")).rejects.toThrow(
        /not found/i,
      );
      expect(prismaMock.correspondenceTemplate.create).not.toHaveBeenCalled();
    });
  });
});
