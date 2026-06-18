"use client";

import { useMemo, type ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { useApp } from "@/lib/contexts/app-context";

type AlertSeverity = "critical" | "warning" | "info";

interface ActionAlert {
  id: string;
  icon: React.ElementType;
  message: string;
  count: number;
  href: string;
  severity: AlertSeverity;
}

const severityStyles: Record<AlertSeverity, string> = {
  critical:
    "border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10",
  warning:
    "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
  info: "border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10",
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
        "flex items-center justify-between rounded-lg border p-4 transition-colors",
        severityStyles[alert.severity],
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{alert.message}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariantMap[alert.severity]} className="tabular-nums">
          {alert.count}
        </Badge>
        <ChevronRight className="h-4 w-4 opacity-50" />
      </div>
    </Link>
  );
}

export function ActionPanel(): ReactElement {
  const { state } = useApp();
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const locale = pathname.split("/")[1] || "pt";

  const { leases = [], receipts = [], maintenance = [], properties = [] } = state;

  const alerts = useMemo<ActionAlert[]>(() => {
    const now = new Date();
    const results: ActionAlert[] = [];

    // --- 1. Unpaid rent this month ---
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

    // --- 2. Overdue payments (pending receipts older than 5 days) ---
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

    // --- 3. Maintenance open > 7 days ---
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const staleMaintenance = maintenance.filter((ticket) => {
      return (
        (ticket.status === "open" || ticket.status === "in_progress") &&
        new Date(ticket.createdAt) < sevenDaysAgo
      );
    });

    if (staleMaintenance.length > 0) {
      // Find oldest for the message
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

    // --- 4. Leases expiring within 30 days ---
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const soonExpiring = activeLeases.filter((l) => {
      const end = new Date(l.endDate);
      return end > now && end <= thirtyDaysFromNow;
    });

    if (soonExpiring.length > 0) {
      // Find the soonest for the label
      const soonest = [...soonExpiring].sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
      )[0];
      const daysLeft = Math.ceil(
        (new Date(soonest.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const propName =
        properties.find((p) => p.id === soonest.propertyId)?.name ??
        soonest.property?.name ??
        "—";
      results.push({
        id: "expiring-30d",
        icon: CalendarClock,
        message: t("leaseExpiringAlert", { property: propName, days: daysLeft }),
        count: soonExpiring.length,
        href: "/leases",
        severity: "critical",
      });
    }

    // --- 5. Leases expiring within 90 days (secondary warning) ---
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const soonExpiring90 = activeLeases.filter((l) => {
      const end = new Date(l.endDate);
      return end > thirtyDaysFromNow && end <= ninetyDaysFromNow;
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

    return results;
  }, [leases, receipts, maintenance, properties, t]);

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
      <CardHeader className="pb-3">
        <CardTitle>{t("actionPanelTitle")}</CardTitle>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("actionPanelSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("allClear")}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{t("allClearDesc")}</p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => <AlertRow key={alert.id} alert={alert} locale={locale} />)
        )}
      </CardContent>
    </Card>
  );
}
