"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Info, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StatusSeverity, SystemStatus } from "@/lib/services/admin/system-status";

/**
 * Operator view of what this instance is actually connected to.
 *
 * The design constraint that shapes everything here: **`simulated` must not look like `ok`.**
 * The connector screens originally rendered `live` in green — the colour of "working" — on the
 * one mode that refuses to act, and the whole point of this page is to stop an operator
 * believing a connection exists when it does not. So `ok` is the only state that gets the
 * success colour, and simulated states get an unmistakably different, informational treatment
 * with the word "simulated" in the text rather than only in the styling.
 *
 * The page renders outside AppDataGate (see app-data-gate.tsx): it has to work when the app
 * does not, because that is when someone opens it.
 */

const SEVERITY_STYLE: Record<StatusSeverity, { chip: string; icon: typeof Info }> = {
  ok: {
    chip: "bg-[var(--semantic-success-soft)] text-[var(--semantic-success-readable)]",
    icon: CheckCircle2,
  },
  simulated: {
    chip: "bg-[var(--semantic-info-soft)] text-[var(--semantic-info-readable)]",
    icon: FlaskConical,
  },
  warning: {
    chip: "bg-[var(--semantic-warning-soft)] text-[var(--semantic-warning-readable)]",
    icon: Info,
  },
  error: {
    chip: "bg-[var(--semantic-danger-soft)] text-[var(--semantic-danger-readable)]",
    icon: AlertTriangle,
  },
};

export function SystemStatusView() {
  const t = useTranslations("admin");
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/admin/system-status", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setStatus(body.data as SystemStatus);
    } catch {
      // No error text from the response: this endpoint is admin-only but the page is still a
      // browser surface, and the server log already holds the detail.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-[var(--color-muted-foreground)]">{t("subtitle")}</p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {t("refresh")}
        </Button>
      </header>

      {/* The standing disclosure. It is not conditional on any check, because it is true of every
          deployment today and an operator should not have to infer it from a row's styling. */}
      <Card className="border-[var(--semantic-info-border,var(--color-border))]">
        <CardContent className="flex gap-3 p-4">
          <FlaskConical
            className="mt-0.5 size-5 shrink-0 text-[var(--semantic-info-readable)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("simulationNotice")}</p>
        </CardContent>
      </Card>

      {failed && (
        <div role="alert" className="rounded-lg border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-foreground)]">{t("loadFailed")}</p>
        </div>
      )}

      {loading && !status && (
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("checking")}</p>
      )}

      {status && (
        <>
          <div className="flex flex-wrap gap-2" aria-label={t("summary")}>
            {(["error", "warning", "simulated", "ok"] as StatusSeverity[])
              .filter((severity) => status.counts[severity] > 0)
              .map((severity) => (
                <span
                  key={severity}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${SEVERITY_STYLE[severity].chip}`}
                >
                  {status.counts[severity]} {t(`severity.${severity}`)}
                </span>
              ))}
          </div>

          {(["platform", "integration"] as const).map((group) => {
            const rows = status.checks.filter((check) => check.group === group);
            if (rows.length === 0) return null;

            return (
              <section key={group} className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  {t(`group.${group}`)}
                </h2>
                <div className="space-y-2">
                  {rows.map((check) => {
                    const style = SEVERITY_STYLE[check.severity];
                    const Icon = style.icon;
                    return (
                      <Card key={check.id}>
                        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                          <Icon
                            className={`mt-0.5 size-5 shrink-0 ${style.chip.split(" ").pop()}`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-[var(--color-foreground)]">
                                {t(`check.${check.id.split(":")[0]}`, {
                                  country: check.id.split(":")[1] ?? "",
                                })}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.chip}`}
                              >
                                {t(`severity.${check.severity}`)}
                              </span>
                            </div>
                            {check.detail && (
                              <p className="text-sm text-[var(--color-muted-foreground)]">
                                {check.detail}
                              </p>
                            )}
                            {/* The remedy is the reason this page exists rather than a status
                                dashboard: knowing something is wrong is only useful with the
                                next step attached. */}
                            {check.remedy && (
                              <p className="text-sm font-medium text-[var(--color-foreground)]">
                                {t("remedy")}: {check.remedy}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <p className="text-xs text-[var(--color-muted-foreground)]">
            {t("generatedAt", { time: new Date(status.generatedAt).toLocaleString() })}
          </p>
        </>
      )}
    </div>
  );
}
