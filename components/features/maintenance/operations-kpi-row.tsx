"use client";

import * as React from "react";
import { useMemo } from "react";

import { cn } from "@/lib/utils/utils";
import type { MaintenanceTicket } from "@/lib/types";

/**
 * Situs Operations summary line — Open / Urgent / Scheduled Inspections /
 * Evidence Required as one inline text line (CLAUDE.md declutter rule 4:
 * counts as text before counts as boxes), not four separate stat panels.
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
    <p className="text-sm text-[var(--color-muted-foreground)]">
      <span className="font-medium text-[var(--color-foreground)]">{open}</span> open ·{" "}
      <span
        className={cn(
          "font-medium",
          urgent > 0 ? "text-[var(--semantic-danger)]" : "text-[var(--color-foreground)]",
        )}
      >
        {urgent}
      </span>{" "}
      urgent · <span className="font-medium text-[var(--color-foreground)]">{scheduled}</span>{" "}
      scheduled (next 14 days) ·{" "}
      <span
        className={cn(
          "font-medium",
          evidenceRequired > 0
            ? "text-[var(--semantic-warning-readable)]"
            : "text-[var(--color-foreground)]",
        )}
      >
        {evidenceRequired}
      </span>{" "}
      evidence required
    </p>
  );
}
