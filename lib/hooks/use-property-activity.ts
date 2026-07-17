"use client";

import { useEffect, useState } from "react";

export interface PropertyCurrentPeriod {
  year: number;
  month: number;
  status: string;
  dueAmount: number;
  allocatedAmount: number;
}

export interface PropertyTimelineEntry {
  id: string;
  amount: number;
  type: string;
  allocatedAt: string;
  reversedAt: string | null;
  createdBy: string;
  period: { year: number; month: number };
}

export interface PropertyAuditEntry {
  id: string;
  action: string;
  resourceType: string | null;
  createdAt: string;
  details: string | null;
}

export interface PropertyActivity {
  currentPeriod: PropertyCurrentPeriod | null;
  receiptLifecycle: string | null;
  timeline: PropertyTimelineEntry[];
  auditLogs: PropertyAuditEntry[];
}

/** Situs Current Period Status / PaymentTimeline / Audit tab — one fetch. */
export function usePropertyActivity(propertyId: string | undefined) {
  const [data, setData] = useState<PropertyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/properties/${propertyId}/activity`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setData(body?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load property activity");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return { data, loading, error };
}
