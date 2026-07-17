"use client";

import * as React from "react";
import { useMemo } from "react";

import type { MaintenanceTicket } from "@/lib/types";

/**
 * Situs Operations KPI row — Scheduled Inspections / Evidence Required.
 * The urgent/open/in-progress/resolved counts already live in the status
 * strip above this row, so those aren't repeated here. "Evidence Required"
 * is a heuristic: an open/in-progress ticket with no attached images — the
 * Documents Evidence tab (deferred to a follow-up PR) will replace this
 * once tickets carry a real evidenceRequired flag.
 */

function isWithinDays(dateStr: string | undefined, days: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr).getTime();
  const now = Date.now();
  return date >= now && date <= now + days * 24 * 60 * 60 * 1000;
}

export function OperationsKpiRow({
  tickets,
}: {
  tickets: MaintenanceTicket[];
}): React.ReactElement {
  const { scheduled, evidenceRequired } = useMemo(() => {
    const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
    return {
      scheduled: tickets.filter((t) => isWithinDays(t.scheduledDate, 14)).length,
      evidenceRequired: openTickets.filter((t) => !t.images || t.images.length === 0).length,
    };
  }, [tickets]);

  return (
    <div className="grid grid-cols-1 gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
      <div>
        <p className="mono-label">Scheduled inspections</p>
        <p className="mt-1 text-xl font-light tabular-nums text-[var(--color-foreground)]">
          {scheduled}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Next 14 days</p>
      </div>
      <div>
        <p className="mono-label">Evidence required</p>
        <p className="mt-1 text-xl font-light tabular-nums text-[var(--semantic-warning-readable)]">
          {evidenceRequired}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Open tickets with no photos attached
        </p>
      </div>
    </div>
  );
}
