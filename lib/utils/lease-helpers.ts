import type { Lease } from "@/lib/types";

/**
 * Find the active (or draft/pending) lease for a given tenant.
 */
export function getActiveLease(tenantId: string, leases: Lease[]): Lease | undefined {
  return leases.find(
    (l) =>
      l.tenantId === tenantId &&
      (l.status === "active" || l.status === "draft" || l.status === "pending"),
  );
}

/**
 * Derive the tenant's current monthly rent from their active lease.
 */
export function getTenantRent(tenantId: string, leases: Lease[]): number {
  return getActiveLease(tenantId, leases)?.monthlyRent ?? 0;
}

/**
 * Derive the tenant's lease start date from their active lease.
 */
export function getTenantLeaseStart(tenantId: string, leases: Lease[]): string | undefined {
  return getActiveLease(tenantId, leases)?.startDate;
}

/**
 * Derive the tenant's lease end date from their active lease.
 */
export function getTenantLeaseEnd(tenantId: string, leases: Lease[]): string | undefined {
  return getActiveLease(tenantId, leases)?.endDate;
}
