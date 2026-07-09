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
