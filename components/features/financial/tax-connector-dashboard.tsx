"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";

/**
 * Situs Tax Connector Dashboard — every fiscal connector (PT AT, ES AEAT, …)
 * with its mode/status/last submission and the explainability trail behind
 * every call (Migration C: TaxAuthorityConnector + TaxSubmissionLog). Mode
 * stays sandbox/review until a connector is explicitly promoted to live —
 * this view is where that would become visible, not where it's changed.
 */

interface Connector {
  id: string;
  country: string;
  connectorKey: string;
  mode: string;
  status: string;
  lastSubmissionAt: string | null;
}

interface SubmissionLog {
  id: string;
  connectorId: string;
  subjectType: string;
  subjectId: string;
  action: string;
  mode: string;
  status: string;
  responseCode: string | null;
  createdAt: string;
}

const MODE_STYLES: Record<string, string> = {
  sandbox: "bg-[var(--semantic-info-soft)] text-[var(--semantic-info-readable)]",
  review: "bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning-readable)]",
  live: "bg-[var(--semantic-success-soft)] text-[var(--semantic-success-readable)]",
};

const LOG_STATUS_STYLES: Record<string, string> = {
  success: "text-[var(--semantic-success-readable)]",
  error: "text-[var(--semantic-danger-readable)]",
  pending: "text-[var(--semantic-warning-readable)]",
};

export function TaxConnectorDashboard(): React.ReactElement | null {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [logsByConnector, setLogsByConnector] = useState<Record<string, SubmissionLog[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tax/connectors", { credentials: "include" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = await res.json();
      setConnectors(body?.data?.connectors ?? []);
      setLogsByConnector(body?.data?.logs ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tax connectors");
      setConnectors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loading && connectors.length === 0 && !error) {
    return (
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted-foreground)]">
        No tax connectors yet — one is created automatically the first time you emit a rent receipt
        through a country&apos;s fiscal workflow.
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="mono-label">Tax connectors · fiscal authority status</p>
      </div>

      {error ? (
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-sm text-[var(--semantic-danger-readable)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="p-6 text-sm text-[var(--color-muted-foreground)]">Loading…</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {connectors.map((connector) => {
            const logs = logsByConnector[connector.id] ?? [];
            const isExpanded = expanded === connector.id;
            return (
              <div key={connector.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : connector.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--color-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs uppercase tracking-[0.04em]">
                      {connector.country}
                    </span>
                    <span className="text-sm">{connector.connectorKey}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] ${
                        MODE_STYLES[connector.mode] ?? ""
                      }`}
                    >
                      {connector.mode}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {connector.lastSubmissionAt
                        ? `Last: ${new Date(connector.lastSubmissionAt).toLocaleDateString()}`
                        : "No submissions yet"}
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-hover)] px-4 py-2">
                    {logs.length === 0 ? (
                      <p className="py-2 text-xs text-[var(--color-muted-foreground)]">
                        No submission log entries yet.
                      </p>
                    ) : (
                      <div className="space-y-1 py-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="font-mono">
                              {log.action} · {log.subjectType}
                            </span>
                            <span className={`font-mono ${LOG_STATUS_STYLES[log.status] ?? ""}`}>
                              {log.status}
                              {log.responseCode ? ` (${log.responseCode})` : ""}
                            </span>
                            <span className="tabular-nums text-[var(--color-muted-foreground)]">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
