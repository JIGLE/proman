import { describe, it, expect, vi } from "vitest";
import { getActivationSummary, getCoreLoopMetrics } from "./activation-summary";

type Prisma = Parameters<typeof getActivationSummary>[0];

function makePrisma(overrides: Record<string, unknown>): Prisma {
  return overrides as unknown as Prisma;
}

describe("getActivationSummary", () => {
  it("reports not activated when a step is missing", async () => {
    const prisma = makePrisma({
      property: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date("2026-01-01") }) },
      tenant: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date("2026-01-02") }) },
      lease: { findFirst: vi.fn().mockResolvedValue(null) },
      receipt: { findFirst: vi.fn().mockResolvedValue(null) },
    });

    const summary = await getActivationSummary(prisma, "user-1");

    expect(summary.isActivated).toBe(false);
    expect(summary.activatedAt).toBeNull();
    expect(summary.firstLeaseAt).toBeNull();
    expect(summary.firstPaidReceiptAt).toBeNull();
  });

  it("reports activated with activatedAt as the latest of the four steps", async () => {
    const prisma = makePrisma({
      property: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date("2026-01-01") }) },
      tenant: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date("2026-01-03") }) },
      lease: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date("2026-01-02") }) },
      receipt: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date("2026-01-10") }) },
    });

    const summary = await getActivationSummary(prisma, "user-1");

    expect(summary.isActivated).toBe(true);
    expect(summary.activatedAt).toEqual(new Date("2026-01-10"));
  });

  it("queries the receipt step scoped to paid status only", async () => {
    const receiptFindFirst = vi.fn().mockResolvedValue(null);
    const prisma = makePrisma({
      property: { findFirst: vi.fn().mockResolvedValue(null) },
      tenant: { findFirst: vi.fn().mockResolvedValue(null) },
      lease: { findFirst: vi.fn().mockResolvedValue(null) },
      receipt: { findFirst: receiptFindFirst },
    });

    await getActivationSummary(prisma, "user-1");

    expect(receiptFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", status: "paid" } }),
    );
  });
});

describe("getCoreLoopMetrics", () => {
  it("aggregates active vs activated landlords correctly", async () => {
    const prisma = makePrisma({
      property: {
        groupBy: vi.fn().mockResolvedValue([{ userId: "a" }, { userId: "b" }, { userId: "c" }]),
      },
      tenant: { groupBy: vi.fn().mockResolvedValue([{ userId: "a" }, { userId: "b" }]) },
      lease: { groupBy: vi.fn().mockResolvedValue([{ userId: "a" }, { userId: "b" }]) },
      receipt: {
        groupBy: vi.fn().mockResolvedValue([{ userId: "a" }]),
        count: vi.fn().mockResolvedValue(42),
      },
      rentReceipt: { count: vi.fn().mockResolvedValue(7) },
      productEvent: { count: vi.fn().mockResolvedValue(13) },
    });

    const metrics = await getCoreLoopMetrics(prisma);

    // a, b, c have properties => 3 active landlords.
    expect(metrics.activeLandlords).toBe(3);
    // only "a" has tenants, leases, AND a paid receipt => 1 activated landlord.
    expect(metrics.activatedLandlords).toBe(1);
    expect(metrics.receiptsPaidLast30Days).toBe(42);
    expect(metrics.rentReceiptsIssuedLast30Days).toBe(7);
    expect(metrics.reminderClicksLast30Days).toBe(13);
  });

  it("counts zero activated landlords when no one has completed every step", async () => {
    const prisma = makePrisma({
      property: { groupBy: vi.fn().mockResolvedValue([{ userId: "a" }]) },
      tenant: { groupBy: vi.fn().mockResolvedValue([]) },
      lease: { groupBy: vi.fn().mockResolvedValue([]) },
      receipt: { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      rentReceipt: { count: vi.fn().mockResolvedValue(0) },
      productEvent: { count: vi.fn().mockResolvedValue(0) },
    });

    const metrics = await getCoreLoopMetrics(prisma);

    expect(metrics.activeLandlords).toBe(1);
    expect(metrics.activatedLandlords).toBe(0);
  });
});
