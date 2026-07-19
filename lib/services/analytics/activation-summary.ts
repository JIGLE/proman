/**
 * Activation and core-loop metrics, derived from existing tables.
 *
 * docs/PRODUCT_AUDIT_2026.md §8 proposes a North-Star — "on-time compliant
 * rent cycles closed per active landlord per month" — and §9 flags that
 * nothing today can measure it. Rather than instrument every creation
 * endpoint with a new event (Property/Tenant/Lease/Receipt already record
 * `createdAt`, and it's the ground truth), this derives the activation
 * timeline and the core-loop input metrics directly from those tables. It
 * also works retroactively for every existing user, not just ones created
 * after this shipped — an event fired only from now on couldn't do that.
 */

import type { getPrismaClient } from "@/lib/services/database/database";

export interface ActivationSummary {
  userId: string;
  firstPropertyAt: Date | null;
  firstTenantAt: Date | null;
  firstLeaseAt: Date | null;
  firstPaidReceiptAt: Date | null;
  /** All four steps of the onboarding checklist are complete. */
  isActivated: boolean;
  /** When the last of the four steps was completed, if activated. */
  activatedAt: Date | null;
}

export async function getActivationSummary(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
): Promise<ActivationSummary> {
  const [firstProperty, firstTenant, firstLease, firstPaidReceipt] = await Promise.all([
    prisma.property.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.tenant.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.lease.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.receipt.findFirst({
      where: { userId, status: "paid" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const firstPropertyAt = firstProperty?.createdAt ?? null;
  const firstTenantAt = firstTenant?.createdAt ?? null;
  const firstLeaseAt = firstLease?.createdAt ?? null;
  const firstPaidReceiptAt = firstPaidReceipt?.createdAt ?? null;

  const steps = [firstPropertyAt, firstTenantAt, firstLeaseAt, firstPaidReceiptAt];
  const isActivated = steps.every((s): s is Date => s !== null);
  const activatedAt = isActivated
    ? new Date(Math.max(...steps.map((s) => (s as Date).getTime())))
    : null;

  return {
    userId,
    firstPropertyAt,
    firstTenantAt,
    firstLeaseAt,
    firstPaidReceiptAt,
    isActivated,
    activatedAt,
  };
}

export interface ComplianceStreakSummary {
  /** Consecutive fully-clean calendar months up to (not including) the current one. */
  streakMonths: number;
  /** Whether the user has any lease history to measure a streak against. */
  hasHistory: boolean;
}

/**
 * "N consecutive on-time compliance months" — the habit-loop reward the audit
 * (§3) recommends in place of one-time achievement badges. A month is "clean"
 * if every lease active during it has at least one paid rent receipt dated
 * in that month; the streak counts backward from the last fully-completed
 * month until a non-clean month, or the start of the user's lease history.
 */
export async function getComplianceStreak(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  referenceDate: Date = new Date(),
): Promise<ComplianceStreakSummary> {
  const leases = await prisma.lease.findMany({
    where: { userId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (leases.length === 0) {
    return { streakMonths: 0, hasHistory: false };
  }

  const paidRentReceipts = await prisma.receipt.findMany({
    where: { userId, type: "rent", status: "paid" },
    select: { leaseId: true, date: true },
  });

  const earliestStart = leases.reduce(
    (min, l) => (l.startDate < min ? l.startDate : min),
    leases[0].startDate,
  );

  const MAX_MONTHS = 60;
  let streakMonths = 0;
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() - 1); // start from the last completed month

  for (let i = 0; i < MAX_MONTHS; i++) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);

    if (monthEnd < earliestStart) break;

    const activeLeaseIds = leases
      .filter((l) => l.startDate <= monthEnd && l.endDate >= monthStart)
      .map((l) => l.id);

    const allPaid = activeLeaseIds.every((leaseId) =>
      paidRentReceipts.some(
        (r) => r.leaseId === leaseId && r.date >= monthStart && r.date <= monthEnd,
      ),
    );

    if (!allPaid) break;

    streakMonths += 1;
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return { streakMonths, hasHistory: true };
}

export interface CoreLoopMetrics {
  /** Users with at least one property. */
  activeLandlords: number;
  /** Users who have completed all four activation steps. */
  activatedLandlords: number;
  /** Receipts marked paid in the last 30 days, across all users. */
  receiptsPaidLast30Days: number;
  /** PT rent receipts (recibo de renda) issued in the last 30 days. */
  rentReceiptsIssuedLast30Days: number;
  /** reminder_clicked events recorded in the last 30 days. */
  reminderClicksLast30Days: number;
}

/** Aggregate core-loop metrics across all users — for an internal/admin view. */
export async function getCoreLoopMetrics(
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<CoreLoopMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeLandlords,
    landlordsWithTenants,
    landlordsWithLeases,
    landlordsWithPaidReceipts,
    receiptsPaidLast30Days,
    rentReceiptsIssuedLast30Days,
    reminderClicksLast30Days,
  ] = await Promise.all([
    prisma.property.groupBy({ by: ["userId"] }),
    prisma.tenant.groupBy({ by: ["userId"] }),
    prisma.lease.groupBy({ by: ["userId"] }),
    prisma.receipt.groupBy({ by: ["userId"], where: { status: "paid" } }),
    prisma.receipt.count({
      where: { status: "paid", updatedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.rentReceipt.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.productEvent.count({
      where: { name: "reminder_clicked", createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const withProperties = new Set(activeLandlords.map((r) => r.userId));
  const withTenants = new Set(landlordsWithTenants.map((r) => r.userId));
  const withLeases = new Set(landlordsWithLeases.map((r) => r.userId));
  const withPaidReceipts = new Set(landlordsWithPaidReceipts.map((r) => r.userId));

  let activatedLandlords = 0;
  for (const userId of withProperties) {
    if (withTenants.has(userId) && withLeases.has(userId) && withPaidReceipts.has(userId)) {
      activatedLandlords++;
    }
  }

  return {
    activeLandlords: withProperties.size,
    activatedLandlords,
    receiptsPaidLast30Days,
    rentReceiptsIssuedLast30Days,
    reminderClicksLast30Days,
  };
}
