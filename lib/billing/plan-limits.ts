// Plan limits for the app's own SaaS subscription (see prisma/schema.prisma's
// Subscription model). Distinct from any tenant-facing rent-collection limits.
// Mirrors the tiers on the landing page pricing section.

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  /** Maximum properties a user on this plan may create. `null` = unlimited. */
  maxProperties: number | null;
  /**
   * Planned team-seat allowance, NOT sold or enforced today. Roadmap 3.2
   * decided against building multi-user sharing for now — consistent
   * enforcement would mean resolving data scope across ~60 API routes,
   * several of them GDPR/admin-sensitive, disproportionate to current
   * demand. See ROADMAP.md's Decisions Log (2026-07-09 entry) for the full
   * decision and the conditions for revisiting it. The landing page's
   * Business tier says "Team access (coming soon)", not a concrete seat
   * count, until this is actually built.
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
