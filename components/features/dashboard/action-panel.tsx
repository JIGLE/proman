"use client";

import { useMemo, useState, useEffect, type ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileWarning,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { useApp } from "@/lib/contexts/app-context";

type AlertSeverity = "critical" | "warning" | "info";

export interface ActionAlert {
  id: string;
  icon: React.ElementType;
  message: string;
  count: number;
  href: string;
  severity: AlertSeverity;
}

const severityRowStyles: Record<AlertSeverity, string> = {
  critical:
    "border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 hover:bg-[var(--color-destructive)]/10",
  warning: "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10",
  info: "border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10",
};

const severityTextStyles: Record<AlertSeverity, string> = {
  critical: "text-[var(--color-destructive)]",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
};

const badgeVariantMap: Record<AlertSeverity, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
};

function AlertRow({ alert, locale }: { alert: ActionAlert; readonly locale: string }) {
  const Icon = alert.icon;
  return (
    <Link
      href={`/${locale}${alert.href}`}
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-4 transition-colors min-h-[64px]",
        severityRowStyles[alert.severity],
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          className={cn("h-5 w-5 shrink-0", severityTextStyles[alert.severity])}
          aria-hidden="true"
        />
        <span
          className={cn("text-sm font-medium leading-snug", severityTextStyles[alert.severity])}
        >
          {alert.message}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <Badge variant={badgeVariantMap[alert.severity]} className="tabular-nums">
          {alert.count}
        </Badge>
        <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function useAlerts(): ActionAlert[] {
  const { state } = useApp();
  const t = useTranslations("dashboard");
  const { leases = [], receipts = [], maintenance = [], properties = [] } = state;

  const [docExpiry, setDocExpiry] = useState<{ critical: number; warning: number } | null>(null);
  useEffect(() => {
    fetch("/api/documents/expiring")
      .then((r) => r.json())
      .then((d) => setDocExpiry(d.data ?? d))
      .catch(() => null);
  }, []);

  return useMemo<ActionAlert[]>(() => {
    const now = new Date();
    const results: ActionAlert[] = [];

    // 1. Unpaid rent this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const activeLeases = leases.filter((l) => l.status === "active");

    const leasesWithoutReceiptThisMonth = activeLeases.filter((lease) => {
      const hasPaidReceipt = receipts.some((r) => {
        const d = new Date(r.date);
        return (
          r.leaseId === lease.id &&
          r.type === "rent" &&
          r.status === "paid" &&
          d >= monthStart &&
          d <= monthEnd
        );
      });
      return !hasPaidReceipt;
    });

    if (leasesWithoutReceiptThisMonth.length > 0) {
      results.push({
        id: "unpaid-rent",
        icon: Clock,
        message: t("rentDueAlert", {
          count: leasesWithoutReceiptThisMonth.length,
          total: activeLeases.length,
        }),
        count: leasesWithoutReceiptThisMonth.length,
        href: "/financials",
        severity: "warning",
      });
    }

    // 2. Overdue payments (pending > 5 days)
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const overdueReceipts = receipts.filter((r) => {
      const d = new Date(r.date);
      return r.status === "pending" && d < fiveDaysAgo;
    });

    if (overdueReceipts.length > 0) {
      results.push({
        id: "overdue-payments",
        icon: AlertTriangle,
        message: t("overdueAlert", { count: overdueReceipts.length }),
        count: overdueReceipts.length,
        href: "/financials",
        severity: "critical",
      });
    }

    // 3. Maintenance open > 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const staleMaintenance = maintenance.filter(
      (ticket) =>
        (ticket.status === "open" || ticket.status === "in_progress") &&
        new Date(ticket.createdAt) < sevenDaysAgo,
    );

    if (staleMaintenance.length > 0) {
      const oldest = [...staleMaintenance].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )[0];
      const daysOpen = Math.floor(
        (now.getTime() - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      results.push({
        id: "stale-maintenance",
        icon: Wrench,
        message: t("maintenanceOpenAlert", { count: staleMaintenance.length, days: daysOpen }),
        count: staleMaintenance.length,
        href: "/maintenance",
        severity: "critical",
      });
    }

    // 4. Leases expiring within 30 days
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const soonExpiring = activeLeases.filter((l) => {
      const end = new Date(l.endDate);
      return end > now && end <= thirtyDaysFromNow;
    });

    const noOfferExpiring = soonExpiring.filter(
      (l) => !l.renewalStatus || l.renewalStatus === "declined",
    );
    const awaitingResponse = soonExpiring.filter((l) => l.renewalStatus === "offered");
    const renewalAccepted = soonExpiring.filter((l) => l.renewalStatus === "accepted");

    if (noOfferExpiring.length > 0) {
      const soonest = [...noOfferExpiring].sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
      )[0];
      const daysLeft = Math.ceil(
        (new Date(soonest.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const propName =
        properties.find((p) => p.id === soonest.propertyId)?.name ?? soonest.property?.name ?? "—";
      results.push({
        id: "expiring-30d-no-offer",
        icon: CalendarClock,
        message: t("leaseExpiringNoRenewal", { property: propName, days: daysLeft }),
        count: noOfferExpiring.length,
        href: "/leases",
        severity: "critical",
      });
    }

    if (awaitingResponse.length > 0) {
      results.push({
        id: "expiring-30d-awaiting",
        icon: CalendarClock,
        message: t("leaseExpiringAwaiting", { count: awaitingResponse.length }),
        count: awaitingResponse.length,
        href: "/leases",
        severity: "warning",
      });
    }

    if (renewalAccepted.length > 0) {
      results.push({
        id: "expiring-30d-accepted",
        icon: CalendarClock,
        message: t("leaseExpiringAccepted", { count: renewalAccepted.length }),
        count: renewalAccepted.length,
        href: "/leases",
        severity: "info",
      });
    }

    // 5. Leases expiring 30–90 days (no renewal)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const soonExpiring90 = activeLeases.filter((l) => {
      const end = new Date(l.endDate);
      return (
        end > thirtyDaysFromNow &&
        end <= ninetyDaysFromNow &&
        (!l.renewalStatus || l.renewalStatus === "declined")
      );
    });

    if (soonExpiring90.length > 0) {
      results.push({
        id: "expiring-90d",
        icon: CalendarClock,
        message: t("leaseExpiring90Alert", { count: soonExpiring90.length }),
        count: soonExpiring90.length,
        href: "/leases",
        severity: "warning",
      });
    }

    // 6. Document expiry
    if (docExpiry?.critical) {
      results.push({
        id: "doc-expiry-critical",
        icon: FileWarning,
        message: t("docExpiryCritical", { count: docExpiry.critical }),
        count: docExpiry.critical,
        href: "/documents",
        severity: "critical",
      });
    }
    if (docExpiry?.warning) {
      results.push({
        id: "doc-expiry-warning",
        icon: FileWarning,
        message: t("docExpiryWarning", { count: docExpiry.warning }),
        count: docExpiry.warning,
        href: "/documents",
        severity: "warning",
      });
    }

    return results;
  }, [leases, receipts, maintenance, properties, t, docExpiry]);
}

export function ActionPanel(): ReactElement {
  const alerts = useAlerts();
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const locale = pathname.split("/")[1] || "pt";

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
            {t("allClear")}
          </p>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{t("allClearDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-2xl border px-5 py-4",
          criticalCount > 0
            ? "border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5"
            : "border-amber-500/20 bg-amber-500/5",
        )}
      >
        <p
          className={cn(
            "text-base font-semibold",
            criticalCount > 0
              ? "text-[var(--color-destructive)]"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {alerts.length === 1
            ? t("oneItemNeedsAttention")
            : t("itemsNeedAttention", { count: alerts.length })}
        </p>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          {t("actionPanelSubtitle")}
        </p>
      </div>
      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} locale={locale} />
      ))}
    </div>
  );
}
