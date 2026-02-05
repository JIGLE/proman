"use client";

import * as React from "react";
import { useMemo, useState, useCallback } from "react";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  FileText,
  BarChart3,
  Percent,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, DonutChart } from "@/components/ui/charts";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils/utils";

/**
 * Insights View — Executive summary dashboard
 *
 * Shows at-a-glance KPIs, actionable alerts, revenue trend, portfolio
 * breakdown, and quick-links to the Analytics & Reports pages.
 */
export function InsightsView(): React.ReactElement {
  const { state } = useApp();
  const { properties, tenants, receipts, leases } = state;
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const locale = useLocale();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Derived metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const totalProperties = properties.length;
    const occupiedCount = properties.filter((p) => p.status === "occupied").length;
    const vacantCount = totalProperties - occupiedCount;
    const occupancyRate = totalProperties > 0 ? (occupiedCount / totalProperties) * 100 : 0;

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => new Date(t.leaseEnd) >= now).length;

    const paidThisMonth = receipts.filter(
      (r) => r.status === "paid" && new Date(r.date) >= startOfMonth
    );
    const monthlyRevenue = paidThisMonth.reduce((s, r) => s + r.amount, 0);

    const paidThisYear = receipts.filter(
      (r) => r.status === "paid" && new Date(r.date) >= startOfYear
    );
    const yearlyRevenue = paidThisYear.reduce((s, r) => s + r.amount, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdueReceipts = receipts.filter(
      (r) => r.status === "pending" && new Date(r.date) < thirtyDaysAgo
    );
    const overdueAmount = overdueReceipts.reduce((s, r) => s + r.amount, 0);

    const activeLeases = leases?.filter((l) => l.status === "active") || [];
    const avgRent =
      activeLeases.length > 0
        ? activeLeases.reduce((s, l) => s + (l.monthlyRent || 0), 0) / activeLeases.length
        : 0;

    // Leases expiring within 60 days
    const sixtyDaysOut = new Date(now);
    sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
    const expiringLeases = (leases || []).filter((l) => {
      const end = new Date(l.endDate);
      return l.status === "active" && end >= now && end <= sixtyDaysOut;
    });

    // Revenue last 6 months for sparkline
    const revenueTrend: { label: string; value: number }[] = [];
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const rev = receipts
        .filter((r) => r.status === "paid" && new Date(r.date) >= d && new Date(r.date) <= end)
        .reduce((s, r) => s + r.amount, 0);
      revenueTrend.push({ label: MONTHS[d.getMonth()], value: rev });
    }

    // Month-over-month change
    const prevMonth = revenueTrend.length >= 2 ? revenueTrend[revenueTrend.length - 2].value : 0;
    const curMonth = revenueTrend.length >= 1 ? revenueTrend[revenueTrend.length - 1].value : 0;
    const momChange = prevMonth > 0 ? ((curMonth - prevMonth) / prevMonth) * 100 : 0;

    // Property type breakdown
    const typeCounts = properties.reduce<Record<string, number>>((acc, p) => {
      const t = p.type || "other";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const typeChart = Object.entries(typeCounts).map(([type, count]) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color:
        type === "apartment" ? "#3b82f6" :
        type === "house" ? "#10b981" :
        type === "commercial" ? "#f59e0b" : "#6b7280",
    }));

    return {
      totalProperties,
      occupiedCount,
      vacantCount,
      occupancyRate,
      totalTenants,
      activeTenants,
      monthlyRevenue,
      yearlyRevenue,
      overdueReceipts,
      overdueAmount,
      avgRent,
      expiringLeases,
      revenueTrend,
      momChange,
      typeChart,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, tenants, receipts, leases, refreshKey]);

  // ── Alerts ───────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const items: { icon: React.ReactNode; label: string; detail: string; severity: "danger" | "warning" | "info"; href: string }[] = [];

    if (metrics.overdueReceipts.length > 0) {
      items.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        label: `${metrics.overdueReceipts.length} overdue payment${metrics.overdueReceipts.length > 1 ? "s" : ""}`,
        detail: formatCurrency(metrics.overdueAmount),
        severity: "danger",
        href: `/${locale}/financials`,
      });
    }

    if (metrics.expiringLeases.length > 0) {
      items.push({
        icon: <CalendarClock className="h-4 w-4" />,
        label: `${metrics.expiringLeases.length} lease${metrics.expiringLeases.length > 1 ? "s" : ""} expiring soon`,
        detail: "Within 60 days",
        severity: "warning",
        href: `/${locale}/leases`,
      });
    }

    if (metrics.vacantCount > 0) {
      items.push({
        icon: <Building2 className="h-4 w-4" />,
        label: `${metrics.vacantCount} vacant propert${metrics.vacantCount > 1 ? "ies" : "y"}`,
        detail: `${metrics.occupancyRate.toFixed(0)}% occupied`,
        severity: metrics.vacantCount > 2 ? "warning" : "info",
        href: `/${locale}/properties`,
      });
    }

    if (items.length === 0) {
      items.push({
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: "All clear",
        detail: "No action items right now",
        severity: "info",
        href: "#",
      });
    }

    return items;
  }, [metrics, formatCurrency, locale]);

  const severityColors: Record<string, string> = {
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Lightbulb className="h-7 w-7 text-amber-400" />
            Insights
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Executive summary of your portfolio performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 self-start">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          label="Monthly Revenue"
          value={formatCurrency(metrics.monthlyRevenue)}
          change={metrics.momChange}
          icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
        />
        <KPITile
          label="Occupancy"
          value={`${metrics.occupancyRate.toFixed(0)}%`}
          sub={`${metrics.occupiedCount} / ${metrics.totalProperties}`}
          icon={<Percent className="h-5 w-5 text-blue-400" />}
        />
        <KPITile
          label="Active Tenants"
          value={metrics.activeTenants}
          sub={`of ${metrics.totalTenants} total`}
          icon={<Users className="h-5 w-5 text-violet-400" />}
        />
        <KPITile
          label="Avg. Rent"
          value={formatCurrency(metrics.avgRent)}
          icon={<TrendingUp className="h-5 w-5 text-cyan-400" />}
        />
      </div>

      {/* ── Alerts ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((a, i) => (
            <button
              key={i}
              onClick={() => a.href !== "#" && router.push(a.href)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors hover:opacity-80",
                severityColors[a.severity]
              )}
            >
              {a.icon}
              <span className="flex-1 text-sm font-medium">{a.label}</span>
              <span className="text-xs opacity-70">{a.detail}</span>
              {a.href !== "#" && <ArrowRight className="h-3.5 w-3.5 opacity-50" />}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              Revenue Trend
              <span className="text-xs font-normal text-[var(--color-muted-foreground)] ml-auto">
                Last 6 months
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.revenueTrend.some((d) => d.value > 0) ? (
              <LineChart data={metrics.revenueTrend} height={220} showValues={false} />
            ) : (
              <div className="flex items-center justify-center h-[220px] text-[var(--color-muted-foreground)] text-sm">
                No revenue data yet — record payments to see trends
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Mix */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              Portfolio Mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.typeChart.length > 0 ? (
              <DonutChart data={metrics.typeChart} height={220} />
            ) : (
              <div className="flex items-center justify-center h-[220px] text-[var(--color-muted-foreground)] text-sm">
                Add properties to see breakdown
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Expiring Leases Preview ─────────────────────────────── */}
      {metrics.expiringLeases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Upcoming Lease Expirations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => router.push(`/${locale}/leases`)}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--color-border)]">
              {metrics.expiringLeases.slice(0, 5).map((lease) => {
                const end = new Date(lease.endDate);
                const now = new Date();
                const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
                const tenant = tenants.find((t) => t.id === lease.tenantId);
                const property = properties.find((p) => p.id === lease.propertyId);

                return (
                  <div key={lease.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{tenant?.name || "Unknown tenant"}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {property?.name || "Unknown property"}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        daysLeft <= 14
                          ? "bg-red-500/15 text-red-400"
                          : daysLeft <= 30
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-blue-500/15 text-blue-400"
                      )}
                    >
                      {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Links ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickLink
          icon={<BarChart3 className="h-5 w-5 text-indigo-400" />}
          title="Analytics Dashboard"
          description="Interactive charts, KPIs, occupancy gauges, and property performance tables"
          onClick={() => router.push(`/${locale}/analytics`)}
        />
        <QuickLink
          icon={<FileText className="h-5 w-5 text-emerald-400" />}
          title="Financial Reports"
          description="Generate and export financial summaries, tax reports, and rent rolls"
          onClick={() => router.push(`/${locale}/reports`)}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function KPITile({
  label,
  value,
  change,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  change?: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
            {label}
          </span>
          <div className="rounded-md bg-[var(--color-muted)]/30 p-1.5">{icon}</div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", change >= 0 ? "text-emerald-400" : "text-red-400")}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% vs last month
          </div>
        )}
        {sub && <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function QuickLink({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 text-left transition-all hover:border-[var(--color-primary)] hover:shadow-md"
    >
      <div className="rounded-lg bg-[var(--color-muted)]/30 p-2.5 transition-colors group-hover:bg-[var(--color-primary)]/10">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold mb-0.5 flex items-center gap-2">
          {title}
          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-70 group-hover:translate-x-0" />
        </h3>
        <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2">{description}</p>
      </div>
    </button>
  );
}

export default InsightsView;
