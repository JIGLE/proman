"use client";

import * as React from "react";
import { useMemo } from "react";

import { cn } from "@/lib/utils/utils";
import type { MaintenanceTicket } from "@/lib/types";

/**
 * Situs Operations KPI row — Open / Urgent / Scheduled Inspections / Evidence
 * Required, one row capped at four metrics (CLAUDE.md declutter rule 2).
 * "Evidence Required" is a heuristic: an open/in-progress ticket with no
 * attached images — the Documents Evidence tab (deferred to a follow-up PR)
 * will replace this once tickets carry a real evidenceRequired flag.
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
  const { open, urgent, scheduled, evidenceRequired } = useMemo(() => {
    const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
    return {
      open: openTickets.length,
      urgent: tickets.filter((t) => t.priority === "urgent").length,
      scheduled: tickets.filter((t) => isWithinDays(t.scheduledDate, 14)).length,
      evidenceRequired: openTickets.filter((t) => !t.images || t.images.length === 0).length,
    };
  }, [tickets]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="panel p-4">
        <p className="mono-label">Open</p>
        <p className="mt-1 text-xl font-light tabular-nums text-[var(--color-foreground)]">
          {open}
        </p>
      </div>
      <div
        className={cn(
          "panel p-4",
          urgent > 0 &&
            "border-l-[3px] border-l-[var(--semantic-danger)] bg-[var(--semantic-danger-soft)]",
        )}
      >
        <p className="mono-label">Urgent</p>
        <p
          className={cn(
            "mt-1 text-xl font-light tabular-nums",
            urgent > 0 ? "text-[var(--semantic-danger)]" : "text-[var(--color-foreground)]",
          )}
        >
          {urgent}
        </p>
      </div>
      <div className="panel p-4">
        <p className="mono-label">Scheduled inspections</p>
        <p className="mt-1 text-xl font-light tabular-nums text-[var(--color-foreground)]">
          {scheduled}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Next 14 days</p>
      </div>
      <div className="panel p-4">
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
