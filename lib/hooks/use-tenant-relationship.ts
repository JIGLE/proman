"use client";

import { useEffect, useState } from "react";

export interface TenantRelationshipData {
  leases: { total: number; active: number };
  periods: {
    total: number;
    overdue: number;
    current: { year: number; month: number; status: string } | null;
  };
  bankMovements: { matched: number; lastMatchedAt: string | null };
  receipts: { total: number; lastLifecycle: string | null; lastAt: string | null };
  taxSubmissions: {
    total: number;
    lastAction: string | null;
    lastStatus: string | null;
    lastAt: string | null;
  };
}

/** Situs tenant relationship map — lease → periods → bank → receipts → tax, one fetch. */
export function useTenantRelationship(tenantId: string | undefined) {
  const [data, setData] = useState<TenantRelationshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tenants/${tenantId}/relationship`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setData(body?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tenant relationship data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return { data, loading, error };
}
