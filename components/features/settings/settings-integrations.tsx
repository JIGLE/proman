"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Landmark, Layers, ScanLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MODE_KIND_STYLES, authorityName, modeKind } from "@/lib/tax/connectors/presentation";

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

// Mode styling comes from lib/tax/connectors/presentation.ts so this surface and the Finance
// tax dashboard cannot drift apart. The old table styled `live` as SUCCESS — green — when it
// is the one mode the connector refuses to act in.

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
  const t = useTranslations("settings.panel");
  // Connector mode wording lives in `common` because the Finance tax dashboard shows the same
  // strings; duplicating them into settings.panel would let the two surfaces drift.
  const tc = useTranslations("common");
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
            {t("bankConnections")}
          </CardTitle>
          <CardDescription>{t("bankConnectionsHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noBankConnection")}</p>
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
            {t("taxConnectors")}
          </CardTitle>
          <CardDescription>{t("taxConnectorsHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noConnectors")}</p>
          ) : (
            <div className="space-y-2">
              {connectors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {c.country} — {authorityName(c.country)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {modeKind(c.mode) === "simulated"
                        ? tc("connectorModeSimulatedHelp", { authority: authorityName(c.country) })
                        : tc("connectorModeUnsupportedHelp", { mode: c.mode })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("lastSubmission", { date: formatDate(c.lastSubmissionAt) })}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs ${MODE_KIND_STYLES[modeKind(c.mode)]}`}
                  >
                    {modeKind(c.mode) === "simulated"
                      ? tc("connectorModeSimulated")
                      : tc("connectorModeUnsupported")}
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
            {t("documentClassification")}
          </CardTitle>
          <CardDescription>{t("classificationHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {t("mockClassifier")}
              </p>
              <p className="text-xs text-muted-foreground">{t("classifierHelp")}</p>
            </div>
            <span className="inline-block rounded-full bg-[var(--semantic-info-soft)] px-2 py-0.5 text-xs text-[var(--semantic-info-readable)]">
              {t("active")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsIntegrations;
