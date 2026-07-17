"use client";

import { useEffect, useState } from "react";
import { Landmark, Layers, ScanLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BankConnection {
  id: string;
  provider: string;
  institutionName: string;
  status: string;
  lastSyncAt: string | null;
}

interface TaxConnector {
  id: string;
  country: string;
  connectorKey: string;
  mode: string;
  status: string;
  lastSubmissionAt: string | null;
}

const MODE_STYLES: Record<string, string> = {
  sandbox: "bg-[var(--semantic-info-soft)] text-[var(--semantic-info-readable)]",
  review: "bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning-readable)]",
  live: "bg-[var(--semantic-success-soft)] text-[var(--semantic-success-readable)]",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[var(--semantic-success-soft)] text-[var(--semantic-success-readable)]",
  pending_consent: "bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning-readable)]",
  expired: "bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger-readable)]",
  revoked: "bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger-readable)]",
  error: "bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger-readable)]",
};

function formatDate(value: string | null): string {
  if (!value) return "never";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "never" : d.toLocaleDateString();
}

/**
 * Read-only status summary for the three Situs automation layers — a
 * quick "is this connected" glance, not a drill-down. Full explainability
 * (submission logs, bank movement inbox) lives in Finance; this tab links
 * out rather than duplicating that view.
 */
export function SettingsIntegrations() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [connectors, setConnectors] = useState<TaxConnector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bankRes, taxRes] = await Promise.all([
          fetch("/api/bank/connections", { credentials: "include" }),
          fetch("/api/tax/connectors", { credentials: "include" }),
        ]);
        if (!cancelled && bankRes.ok) {
          const body = await bankRes.json();
          setConnections(body?.data?.connections ?? []);
        }
        if (!cancelled && taxRes.ok) {
          const body = await taxRes.json();
          setConnectors(body?.data?.connectors ?? []);
        }
      } catch {
        // Best-effort status view — leave empty on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Bank Connections
          </CardTitle>
          <CardDescription>Accounts feeding the Finance &gt; Bank Movements inbox</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bank connection yet — import a CSV statement from Finance &gt; Bank Movements to
              create one.
            </p>
          ) : (
            <div className="space-y-2">
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {c.institutionName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{c.provider}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[c.status] ?? ""}`}
                    >
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last sync: {formatDate(c.lastSyncAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tax Connectors
          </CardTitle>
          <CardDescription>
            Full submission history lives in Finance &gt; Tax Summary — this is a status glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tax connectors configured yet.</p>
          ) : (
            <div className="space-y-2">
              {connectors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {c.country} — {c.connectorKey}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last submission: {formatDate(c.lastSubmissionAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${MODE_STYLES[c.mode] ?? ""}`}
                  >
                    {c.mode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Document Classification
          </CardTitle>
          <CardDescription>Runs on every document upload</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">Mock classifier</p>
              <p className="text-xs text-muted-foreground">
                Keyword-based type detection across all 4 locales — ambiguous or unlinked results
                land in Documents &gt; Review Required
              </p>
            </div>
            <span className="inline-block rounded-full bg-[var(--semantic-info-soft)] px-2 py-0.5 text-xs text-[var(--semantic-info-readable)]">
              active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsIntegrations;
