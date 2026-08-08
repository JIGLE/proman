"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Situs AuditTrail — a reusable panel over AuditLog (resourceType/resourceId
 * persisted since Migration A). Pass `resourceIds` to scope to specific
 * records (property detail); omit it for the account-wide trail (Account
 * page). Same shape either way — one API, one component.
 */

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
}

export interface AuditTrailProps {
  /** Scope to these record ids; omit for the account-wide trail. */
  resourceIds?: string[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AuditTrail({
  resourceIds,
  emptyTitle = "Audit trail",
  emptyDescription = "Activity — payment allocations, receipt emissions, document changes and manual overrides — will appear here.",
}: AuditTrailProps): React.ReactElement {
  const t = useTranslations("common");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resourceIds && resourceIds.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const query = resourceIds ? `?resourceIds=${resourceIds.join(",")}` : "";
    fetch(`/api/audit-trail${query}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setEntries(body?.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load the audit trail");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resourceIds array identity changes every render; join() is the real dep
  }, [resourceIds?.join(",")]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--semantic-danger-readable)]">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)]">
            <History className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </div>
          <p className="mono-label">{emptyTitle}</p>
          <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
            {emptyDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="mono-label">{t("auditTrail")}</p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.04em]">
                {entry.action.replace(/_/g, " ")}
              </span>
              <span className="tabular-nums text-xs text-[var(--color-muted-foreground)]">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
