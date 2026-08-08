"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Camera, CheckCircle2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MaintenanceTicket } from "@/lib/types";

interface OperationsEvidenceProps {
  tickets: MaintenanceTicket[];
  onToggleRequired: (ticket: MaintenanceTicket, required: boolean) => void;
  onTicketClick: (ticket: MaintenanceTicket) => void;
}

/** Which tickets need photo proof, and whether it's been attached yet.
 * "Attached" reads MaintenanceTicket.images — the existing Photos tab on the
 * ticket detail modal is the only place evidence is uploaded; this view is a
 * read/toggle surface over that, not a new upload path. */
export function OperationsEvidence({
  tickets,
  onToggleRequired,
  onTicketClick,
}: OperationsEvidenceProps) {
  const t = useTranslations("common");
  const sorted = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const aMissing = !!a.evidenceRequired && (a.images?.length ?? 0) === 0;
      const bMissing = !!b.evidenceRequired && (b.images?.length ?? 0) === 0;
      if (aMissing !== bMissing) return aMissing ? -1 : 1;
      if (!!a.evidenceRequired !== !!b.evidenceRequired) return a.evidenceRequired ? -1 : 1;
      return 0;
    });
  }, [tickets]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center">
        <Camera className="mx-auto h-8 w-8 text-[var(--color-muted-foreground)] mb-2 opacity-50" />
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("noTickets")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((ticket) => {
        const attached = (ticket.images?.length ?? 0) > 0;
        const missing = !!ticket.evidenceRequired && !attached;
        return (
          <div
            key={ticket.id}
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5"
          >
            <button
              onClick={() => onTicketClick(ticket)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                  {ticket.title}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {ticket.propertyName || "Unknown property"}
                </p>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-3">
              {ticket.evidenceRequired && (
                <Badge
                  variant="outline"
                  className={
                    missing
                      ? "border-[var(--color-destructive)]/30 bg-[var(--color-error-muted)] text-[var(--color-destructive)]"
                      : "border-[var(--color-success)]/30 bg-[var(--color-success-muted)] text-[var(--color-success)]"
                  }
                >
                  {missing ? (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  )}
                  {missing ? "Missing" : `${ticket.images?.length} attached`}
                </Badge>
              )}
              <label className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                {t("required")}
                <Switch
                  checked={!!ticket.evidenceRequired}
                  onCheckedChange={(checked) => onToggleRequired(ticket, checked)}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default OperationsEvidence;
