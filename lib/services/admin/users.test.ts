import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Deleting a `User` cascades to properties, tenants, leases, receipts and allocations — the whole
 * portfolio, with no undo from the UI. Two of the three refusals below exist because the obvious
 * implementation locks the operator out of their own instance.
 *
 * `refuseDeletion` is pure and takes counts rather than reading them, so every case is enumerable
 * here without a database.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/services/database/database", () => ({ getPrismaClient: () => prismaMock }));

import { deleteUser, listUsers, refuseDeletion } from "./users";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refusing a deletion", () => {
  const base = { callerId: "admin-1", targetId: "other-1", targetIsAdmin: false, totalAdmins: 2 };

  it("allows removing an ordinary account", () => {
    expect(refuseDeletion(base)).toBeNull();
  });

  it("refuses deleting yourself", () => {
    // Ends your own session, and on a single-operator instance ends the instance.
    expect(refuseDeletion({ ...base, targetId: "admin-1" })).toBe("self");
  });

  it("refuses removing the last administrator", () => {
    // The same lockout by a longer route: nobody left who can administer the instance.
    expect(refuseDeletion({ ...base, targetIsAdmin: true, totalAdmins: 1 })).toBe("last_admin");
  });

  it("allows removing an admin while another remains", () => {
    expect(refuseDeletion({ ...base, targetIsAdmin: true, totalAdmins: 2 })).toBeNull();
  });

  it("reports self before last_admin when both apply", () => {
    // A sole admin deleting themselves trips both rules. "self" is the more actionable message —
    // "promote another account first" is confusing when the account in question is your own.
    expect(
      refuseDeletion({
        callerId: "admin-1",
        targetId: "admin-1",
        targetIsAdmin: true,
        totalAdmins: 1,
      }),
    ).toBe("self");
  });
});

describe("deleting through the service", () => {
  it("refuses an unknown id without counting anything", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(deleteUser("admin-1", "ghost")).resolves.toEqual({
      deleted: false,
      refusal: "not_found",
    });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("does not delete when the guard refuses", async () => {
    // The assertion that matters: a refusal must not be advisory. Returning the refusal while
    // still calling delete would pass a shallower test and destroy a portfolio.
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    prismaMock.user.count.mockResolvedValue(1);

    const result = await deleteUser("admin-1", "admin-1");
    expect(result).toEqual({ deleted: false, refusal: "self" });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("deletes when nothing refuses", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "other-1", role: "USER" });
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.delete.mockResolvedValue({ id: "other-1" });

    await expect(deleteUser("admin-1", "other-1")).resolves.toEqual({ deleted: true });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "other-1" } });
  });
});

describe("listing accounts", () => {
  it("marks the caller and reports what each account owns", async () => {
    // The counts are the informed half of "are you sure?" — the confirm dialog names them instead
    // of asking a question whose answer destroys a ledger.
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "admin-1",
        email: "owner@example.org",
        name: "Owner",
        role: "ADMIN",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        _count: { properties: 3, tenants: 5, leases: 4, receipts: 40 },
      },
      {
        id: "other-1",
        email: "stranger@example.org",
        name: null,
        role: "ADMIN",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        _count: { properties: 0, tenants: 0, leases: 0, receipts: 0 },
      },
    ]);

    const rows = await listUsers("admin-1");

    expect(rows[0].isSelf).toBe(true);
    expect(rows[1].isSelf).toBe(false);
    expect(rows[0].owns).toEqual({ properties: 3, tenants: 5, leases: 4, receipts: 40 });
    // A stranger admitted during the open-registration window: an ADMIN owning nothing. That
    // shape is precisely what this page exists to make visible.
    expect(rows[1].role).toBe("ADMIN");
    expect(rows[1].owns.properties).toBe(0);
    expect(rows[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
