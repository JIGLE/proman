// Plan limits for the app's own SaaS subscription (see prisma/schema.prisma's
// Subscription model). Distinct from any tenant-facing rent-collection limits.
// Mirrors the tiers on the landing page pricing section.

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  /** Maximum properties a user on this plan may create. `null` = unlimited. */
  maxProperties: number | null;
  /**
   * Team seats included with this plan, per the marketing copy. Not
   * enforced today — there is no Org/Team model yet (roadmap 3.2), so every
   * plan is still single-account. Kept here so the number stays in one
   * place once seats are wired up.
   */
  maxSeats: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxProperties: 1, maxSeats: 1 },
  pro: { maxProperties: 10, maxSeats: 1 },
  business: { maxProperties: null, maxSeats: 5 },
};

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}
