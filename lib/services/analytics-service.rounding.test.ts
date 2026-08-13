import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Pins that analytics aggregations are rounded at the boundary.
 *
 * Every money column in this schema is a Prisma `Float` (see lib/utils/money.ts for why that
 * is not being migrated). Repeated addition drifts — `0.1 + 0.2 === 0.30000000000000004` — and
 * a mean drifts worse, because the division rarely lands on a representable value. Before this,
 * a dashboard could render "€333.33333333333337" or "66.66666666666667% occupied".
 *
 * That was correctly triaged as P2: the ledger and the tax paths already round, so this is
 * cosmetic rather than a filing risk. Cosmetic on the screen a landlord checks every morning
 * is still worth fixing, and worth pinning so it does not come back the next time someone adds
 * a metric.
 *
 * The fixtures below are chosen so that an UNROUNDED implementation produces a visibly wrong
 * number — every assertion would fail against the previous code.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    property: { findMany: vi.fn() },
    tenant: { findMany: vi.fn() },
    receipt: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    lease: { findMany: vi.fn() },
    maintenanceRequest: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("./database/database", () => ({ getPrismaClient: () => prismaMock }));

import { analyticsService } from "./analytics-service";

const money = (amounts: number[], status = "paid") =>
  amounts.map((amount, i) => ({ id: `r${i}`, amount, status, date: new Date("2026-06-01") }));

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.property.findMany.mockResolvedValue([
    { id: "p1", units: [{ status: "occupied" }, { status: "vacant" }, { status: "occupied" }] },
  ]);
  prismaMock.tenant.findMany.mockResolvedValue([]);
  prismaMock.expense.findMany.mockResolvedValue([]);
  prismaMock.lease.findMany.mockResolvedValue([]);
  prismaMock.receipt.findMany.mockResolvedValue([]);
});

describe("KPI metrics round at the aggregation boundary", () => {
  it("sums money without accumulating float error", async () => {
    // 0.1 + 0.2 + 0.3 is 0.6000000000000001 under naive addition.
    prismaMock.receipt.findMany.mockResolvedValue(money([0.1, 0.2, 0.3]));

    const kpis = await analyticsService.getKPIMetrics("user-1");

    expect(kpis.monthlyRevenue).toBe(0.6);
  });

  it("rounds a mean rent instead of exposing the division tail", async () => {
    // €1,000 across 3 leases is 333.33333333333337 unrounded.
    prismaMock.lease.findMany.mockResolvedValue([
      { monthlyRent: 400 },
      { monthlyRent: 300 },
      { monthlyRent: 300 },
    ]);

    const kpis = await analyticsService.getKPIMetrics("user-1");

    expect(kpis.averageRent).toBe(333.33);
  });

  it("rounds the occupancy percentage", async () => {
    // 2 of 3 units is 66.66666666666666 unrounded.
    const kpis = await analyticsService.getKPIMetrics("user-1");

    expect(kpis.occupancyRate).toBe(66.67);
  });

  it("rounds net income rather than subtracting two drifting sums", async () => {
    prismaMock.receipt.findMany.mockResolvedValue(money([0.3]));
    prismaMock.expense.findMany.mockResolvedValue([
      { amount: 0.1, date: new Date("2026-06-01") },
      { amount: 0.1, date: new Date("2026-06-01") },
    ]);

    const kpis = await analyticsService.getKPIMetrics("user-1");

    // 0.3 - (0.1 + 0.1) is 0.09999999999999998 unrounded.
    expect(kpis.netIncome).toBe(0.1);
  });

  it("rounds the collection rate", async () => {
    prismaMock.receipt.findMany.mockResolvedValue([
      ...money([100], "paid"),
      ...money([100], "pending"),
      ...money([100], "pending"),
    ]);

    const kpis = await analyticsService.getKPIMetrics("user-1");

    // 1 of 3 paid is 33.33333333333333 unrounded.
    expect(kpis.collectionRate).toBe(33.33);
  });

  it("returns no metric with more than two decimal places", async () => {
    // The catch-all. A new metric added without round2 fails here even if nobody adds a case
    // for it above — which is the failure mode the per-metric assertions cannot cover.
    prismaMock.receipt.findMany.mockResolvedValue(money([0.1, 0.2]));
    prismaMock.lease.findMany.mockResolvedValue([
      { monthlyRent: 400 },
      { monthlyRent: 300 },
      { monthlyRent: 300 },
    ]);

    const kpis = await analyticsService.getKPIMetrics("user-1");

    const overPrecise = Object.entries(kpis).filter(
      ([, v]) => typeof v === "number" && Math.round(v * 100) / 100 !== v,
    );
    expect(
      overPrecise,
      `metrics carrying sub-cent precision: ${JSON.stringify(overPrecise)}`,
    ).toEqual([]);
  });
});
