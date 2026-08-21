"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Metrics {
  period: { startDate: string; endDate: string };
  portfolio: {
    income: number;
    rent: number;
    expenses: number;
    netIncome: number;
    profitMargin: number;
    expensesByCategory: { category: string; amount: number }[];
  } | null;
  instance: {
    accounts: { total: number; admins: number };
    databaseBytes: number | null;
    documents: { count: number; bytes: number | null };
    auditLogEntries: number;
    activation: Record<string, number> | null;
  };
}

/** Bytes, or an explicit unknown. Never 0 standing in for "could not measure". */
function bytes(value: number | null, unknown: string): string {
  if (value === null) return unknown;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--color-foreground)]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Two families of number, in two blocks that never share a row.
 *
 * The separation is the requirement. "Revenue" beside "accounts" invites reading one as the other,
 * and a portfolio figure mistaken for an instance figure — or the reverse — is the kind of error
 * nobody catches, because both are plausible.
 *
 * The portfolio block is the SIGNED-IN ADMIN'S OWN portfolio, not an instance-wide sum. Every read
 * in this app is user-scoped and an admin has no business reading another account's rent. The
 * heading says so rather than leaving it to be inferred.
 */
export function AdminMetricsView() {
  const t = useTranslations("admin.metrics");
  const tc = useTranslations("financial.categories");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        setMetrics(body?.data ?? null);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  if (failed || !metrics) {
    return (
      <p
        role="alert"
        className="rounded-md bg-[var(--semantic-danger-soft)] px-3 py-2 text-sm text-[var(--semantic-danger-readable)]"
      >
        {t("loadFailed")}
      </p>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(value);

  const hosting = metrics.portfolio?.expensesByCategory.find(
    (row) => row.category === "software_hosting",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("period", { start: metrics.period.startDate, end: metrics.period.endDate })}
        </p>
      </div>

      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-4">
        <h2 className="text-sm font-medium text-[var(--color-foreground)]">
          {t("portfolioTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("portfolioScope")}</p>

        {metrics.portfolio ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure label={t("rent")} value={money(metrics.portfolio.rent)} />
              <Figure label={t("income")} value={money(metrics.portfolio.income)} />
              <Figure label={t("expenses")} value={money(metrics.portfolio.expenses)} />
              <Figure
                label={t("net")}
                value={money(metrics.portfolio.netIncome)}
                hint={t("margin", { value: metrics.portfolio.profitMargin.toFixed(1) })}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {hosting
                ? t("runningCosts", {
                    amount: money(hosting.amount),
                    category: tc("software_hosting"),
                  })
                : t("runningCostsNone", { category: tc("software_hosting") })}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("portfolioUnavailable")}</p>
        )}
      </section>

      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-4">
        <h2 className="text-sm font-medium text-[var(--color-foreground)]">{t("instanceTitle")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("instanceScope")}</p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure
            label={t("accounts")}
            value={String(metrics.instance.accounts.total)}
            hint={t("admins", { count: metrics.instance.accounts.admins })}
          />
          <Figure
            label={t("database")}
            value={bytes(metrics.instance.databaseBytes, t("unknown"))}
          />
          <Figure
            label={t("documents")}
            value={String(metrics.instance.documents.count)}
            hint={bytes(metrics.instance.documents.bytes, t("unknown"))}
          />
          <Figure label={t("auditEntries")} value={String(metrics.instance.auditLogEntries)} />
        </div>

        {metrics.instance.activation ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("activation", {
              paid: metrics.instance.activation.receiptsPaidLast30Days ?? 0,
              issued: metrics.instance.activation.rentReceiptsIssuedLast30Days ?? 0,
            })}
          </p>
        ) : null}
      </section>
    </div>
  );
}

export default AdminMetricsView;
