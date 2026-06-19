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
    "border-[var(--color-warning)]/20 bg-[var(--color-warning-muted)] text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10",
  info: "border-[var(--color-info)]/20 bg-[var(--color-info-muted)] text-[var(--color-info)] hover:bg-[var(--color-info)]/10",
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

  const [docExpiry, setDocExpiry] = useState<{ critical: number; warning: number } | null>(null);
  useEffect(() => {
    fetch("/api/documents/expiring")
      .then((r) => r.json())
      .then((d) => setDocExpiry(d.data ?? d))
      .catch(() => null);
  }, []);

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

    // --- 4. Leases expiring within 30 days (renewal-aware) ---
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const soonExpiring = activeLeases.filter((l) => {
      const end = new Date(l.endDate);
      return end > now && end <= thirtyDaysFromNow;
    });

    // Split by renewal status for contextual messaging
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

    // --- 5. Leases expiring within 90 days (secondary warning, no renewal offered) ---
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

    // --- 6. Document expiry ---
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

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
      <CardHeader className="pb-3">
        <CardTitle>{t("actionPanelTitle")}</CardTitle>
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("actionPanelSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-success)]/20 bg-[var(--color-success-muted)] p-4">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-success)]">{t("allClear")}</p>
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
