"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RenderTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";

// Generate month options for last 12 months
function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export function RentRollView() {
  const t = useTranslations("financial.rentRoll");
  const tForms = useTranslations("forms");
  const { state } = useApp();
  const { leases, receipts, properties, tenants } = state;
  const { formatCurrency } = useCurrency();

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const rentRoll = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // Get active leases
    const activeLeases = leases.filter((l) => {
      if (l.status !== "active") return false;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);
      return start <= periodEnd && end >= periodStart;
    });

    return activeLeases.map((lease) => {
      const property = properties.find((p) => p.id === lease.propertyId);
      const tenant = tenants.find((t) => t.id === lease.tenantId);

      // Sum receipts for this property+tenant in the selected month
      const monthReceipts = receipts.filter((r) => {
        const rDate = new Date(r.date);
        return (
          r.propertyId === lease.propertyId &&
          r.tenantId === lease.tenantId &&
          rDate.getFullYear() === year &&
          rDate.getMonth() + 1 === month &&
          r.status === "paid"
        );
      });
      const received = monthReceipts.reduce((sum, r) => sum + r.amount, 0);
      const expected = lease.monthlyRent;
      const delta = received - expected;

      let status: "paid" | "partial" | "unpaid" = "unpaid";
      if (received >= expected) status = "paid";
      else if (received > 0) status = "partial";

      return {
        leaseId: lease.id,
        propertyName: property?.name ?? "Unknown",
        tenantName: tenant?.name ?? "Unknown",
        expected,
        received,
        delta,
        status,
      };
    });
  }, [leases, receipts, properties, tenants, selectedMonth]);

  const totals = useMemo(() => {
    return rentRoll.reduce(
      (acc, row) => ({
        expected: acc.expected + row.expected,
        received: acc.received + row.received,
        delta: acc.delta + row.delta,
      }),
      { expected: 0, received: 0, delta: 0 },
    );
  }, [rentRoll]);

  const statusBadge = (status: "paid" | "partial" | "unpaid") => {
    const styles = {
      paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      partial: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      unpaid: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    const labels = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };
    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[var(--color-foreground)] flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {t("heading")}
        </CardTitle>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {rentRoll.length === 0 ? (
          <p className="text-center text-[var(--color-muted-foreground)] py-8">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            <RenderTable
              data={rentRoll}
              rowKey={(row) => row.leaseId}
              className="rounded-lg border border-[var(--color-border)]"
              cardMode
              renderCard={(row) => (
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                        {row.propertyName}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {row.tenantName}
                      </p>
                    </div>
                    {statusBadge(row.status)}
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="mono-label">{t("expected")}</dt>
                      <dd className="tabular-nums text-[var(--color-muted-foreground)]">
                        {formatCurrency(row.expected)}
                      </dd>
                    </div>
                    <div>
                      <dt className="mono-label">{t("received")}</dt>
                      <dd className="tabular-nums text-[var(--color-foreground)]">
                        {formatCurrency(row.received)}
                      </dd>
                    </div>
                    <div>
                      <dt className="mono-label">{t("delta")}</dt>
                      <dd
                        className={`font-medium tabular-nums ${row.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {row.delta >= 0 ? "+" : ""}
                        {formatCurrency(row.delta)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
              columns={[
                {
                  key: "property",
                  header: tForms("property"),
                  cell: (row) => row.propertyName,
                  cellClassName: "text-sm font-medium text-[var(--color-foreground)]",
                },
                {
                  key: "tenant",
                  header: tForms("tenant"),
                  cell: (row) => row.tenantName,
                  cellClassName: "text-sm text-[var(--color-muted-foreground)]",
                },
                {
                  key: "expected",
                  header: t("expected"),
                  headerClassName: "text-right",
                  cell: (row) => formatCurrency(row.expected),
                  cellClassName: "text-sm text-[var(--color-muted-foreground)] text-right",
                },
                {
                  key: "received",
                  header: t("received"),
                  headerClassName: "text-right",
                  cell: (row) => formatCurrency(row.received),
                  cellClassName: "text-sm text-[var(--color-foreground)] text-right",
                },
                {
                  key: "delta",
                  header: t("delta"),
                  headerClassName: "text-right",
                  cell: (row) => (
                    <span className={row.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {row.delta >= 0 ? "+" : ""}
                      {formatCurrency(row.delta)}
                    </span>
                  ),
                  cellClassName: "text-sm text-right font-medium",
                },
                { key: "status", header: tForms("status"), cell: (row) => statusBadge(row.status) },
              ]}
            />

            {/* Totals live beside the table rather than inside it: `RenderTable` has no footer
                row, and a totals row appended to a card list reads as one more record. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold">
              <span className="text-[var(--color-foreground)]">{t("totals")}</span>
              <span className="flex flex-wrap items-center gap-x-5 tabular-nums">
                <span className="text-[var(--color-muted-foreground)]">
                  {formatCurrency(totals.expected)}
                </span>
                <span className="text-[var(--color-foreground)]">
                  {formatCurrency(totals.received)}
                </span>
                <span className={totals.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {totals.delta >= 0 ? "+" : ""}
                  {formatCurrency(totals.delta)}
                </span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
