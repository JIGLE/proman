"use client";

import { type ElementType, type ReactElement, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeEuro,
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  Home,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { cn } from "@/lib/utils/utils";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { getActiveLease } from "@/lib/utils/lease-helpers";

export interface OverviewViewProps {
  onAddProperty?: () => void;
  onAddTenant?: () => void;
  onAddLease?: () => void;
  onRecordPayment?: () => void;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 5);
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone?: "default" | "danger" | "success" | "info";
}) {
  const toneClasses = {
    default: "border-white/10 bg-white/[0.03] text-zinc-100",
    danger: "border-red-500/20 bg-red-500/10 text-red-50",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-50",
    info: "border-blue-500/20 bg-blue-500/10 text-blue-50",
  };

  return (
    <Card className={cn("overflow-hidden border shadow-sm", toneClasses[tone])}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{value}</p>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <Icon className="h-5 w-5 text-zinc-100" />
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ActionTile({
  title,
  subtitle,
  icon: Icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: ElementType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="rounded-xl bg-white/10 p-2">
        <Icon className="h-4 w-4 text-zinc-100" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-50">{title}</p>
        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
      </div>
    </button>
  );
}

export function OverviewView({
  onAddProperty,
  onAddTenant,
  onAddLease,
  onRecordPayment,
}: OverviewViewProps = {}): ReactElement {
  const { state } = useApp();
  const { formatCurrency } = useCurrency();
  const { isOwnerPortal } = usePortalAccess();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt";

  const { properties = [], tenants = [], leases = [], receipts = [], loading } = state;

  const navigate = (href: string) => router.push(`/${locale}${href}`);
  const handleAddProperty = () => onAddProperty?.() ?? navigate("/portfolio");
  const handleAddTenant = () => onAddTenant?.() ?? navigate("/people");
  const handleAddLease = () => onAddLease?.() ?? navigate("/leases");
  const handleRecordPayment = () => onRecordPayment?.() ?? navigate("/financials?tab=receipts");

  const dashboardData = useMemo(() => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const occupiedProperties = properties.filter(
      (property) => property.status === "occupied",
    ).length;
    const occupancyRate =
      properties.length > 0 ? (occupiedProperties / properties.length) * 100 : 0;

    const monthlyIncome = receipts
      .filter((receipt) => {
        const receiptDate = new Date(receipt.date);
        return (
          receipt.status === "paid" &&
          receipt.type === "rent" &&
          receiptDate >= monthStart &&
          receiptDate <= monthEnd
        );
      })
      .reduce((sum, receipt) => sum + receipt.amount, 0);

    const overdueTenants = tenants.filter((tenant) => tenant.paymentStatus === "overdue");
    const overdueRent = overdueTenants.reduce((sum, tenant) => {
      const activeLease = getActiveLease(tenant.id, leases);
      return sum + (activeLease?.monthlyRent ?? tenant.rent ?? 0);
    }, 0);

    const pendingReceipts = receipts.filter((receipt) => receipt.status === "pending").length;

    const recentPayments = [...receipts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    const overdueQueue = overdueTenants
      .map((tenant) => {
        const activeLease = getActiveLease(tenant.id, leases);
        const relatedPropertyId = activeLease?.propertyId ?? tenant.propertyId;

        return {
          id: tenant.id,
          tenantName: tenant.name,
          propertyName:
            properties.find((property) => property.id === relatedPropertyId)?.name ??
            tenant.propertyName ??
            "Unassigned property",
          amountDue: activeLease?.monthlyRent ?? tenant.rent ?? 0,
          dueDate: tenant.lastPayment || activeLease?.startDate,
        };
      })
      .slice(0, 4);

    const expiringLeases = [...leases]
      .filter((lease) => lease.status === "active")
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 4)
      .map((lease) => ({
        id: lease.id,
        propertyName:
          properties.find((property) => property.id === lease.propertyId)?.name ??
          lease.property?.name ??
          "Property",
        tenantName:
          tenants.find((tenant) => tenant.id === lease.tenantId)?.name ??
          lease.tenant?.name ??
          "Tenant",
        endDate: lease.endDate,
      }));

    const tenant = tenants[0] ?? null;
    const activeLease = tenant ? getActiveLease(tenant.id, leases) : null;
    const home = properties.find(
      (property) => property.id === (activeLease?.propertyId ?? tenant?.propertyId),
    );
    const paidReceipts = receipts.filter((receipt) => receipt.status === "paid");
    const nextPaymentDate = addMonths(new Date(), 1);

    return {
      occupancyRate,
      monthlyIncome,
      overdueRent,
      pendingReceipts,
      recentPayments,
      overdueQueue,
      expiringLeases,
      tenant,
      activeLease,
      home,
      paidReceipts,
      nextPaymentDate,
    };
  }, [leases, properties, receipts, tenants]);

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-muted)]/30" />;
  }

  if (properties.length === 0 && isOwnerPortal) {
    return (
      <EmptyStateIllustration
        type="properties"
        title="Start managing your portfolio"
        description="Add your first property, then connect the tenant, lease, and first payment."
        onAction={handleAddProperty}
        actionLabel="Add your first property"
      />
    );
  }

  if (isOwnerPortal) {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 shadow-2xl shadow-black/20">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
                <Sparkles className="h-4 w-4" />
                Daily operations for {firstName}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                  Stay ahead of overdue rent, expiring leases, and receipt follow-up.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  Your owner workspace highlights what needs attention first, keeps cash flow
                  visible, and gives you direct paths into payments, tenants, and portfolio
                  activity.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ActionTile
                  title="Add property"
                  subtitle="Expand the portfolio with a new unit."
                  icon={Plus}
                  onClick={handleAddProperty}
                />
                <ActionTile
                  title="Add tenant"
                  subtitle="Assign a resident and start the lease flow."
                  icon={UserRound}
                  onClick={handleAddTenant}
                />
                <ActionTile
                  title="Record payment"
                  subtitle="Issue the payment record and prepare the receipt."
                  icon={Receipt}
                  onClick={handleRecordPayment}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                title="Overdue rent"
                value={formatCurrency(dashboardData.overdueRent)}
                subtitle={`${dashboardData.overdueQueue.length} tenant${dashboardData.overdueQueue.length === 1 ? "" : "s"} need follow-up`}
                icon={AlertTriangle}
                tone="danger"
              />
              <MetricCard
                title="Collected this month"
                value={formatCurrency(dashboardData.monthlyIncome)}
                subtitle="Paid rent already posted this month"
                icon={BadgeEuro}
                tone="success"
              />
              <MetricCard
                title="Occupancy"
                value={`${dashboardData.occupancyRate.toFixed(0)}%`}
                subtitle={`${properties.length} properties currently tracked`}
                icon={Building2}
                tone="info"
              />
              <MetricCard
                title="Receipts pending"
                value={`${dashboardData.pendingReceipts}`}
                subtitle="Records still waiting for review or output"
                icon={FileText}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/10 bg-zinc-950/70">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Action queue</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">
                  Prioritize collection and contract tasks before they become problems.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRecordPayment}>
                Open payments
              </Button>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100">Overdue rent</h3>
                  <Badge variant="destructive">{dashboardData.overdueQueue.length}</Badge>
                </div>
                {dashboardData.overdueQueue.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                    No overdue payments today.
                  </div>
                ) : (
                  dashboardData.overdueQueue.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-50">{item.tenantName}</p>
                          <p className="text-sm text-zinc-400">{item.propertyName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-zinc-50">
                            {formatCurrency(item.amountDue)}
                          </p>
                          <p className="text-xs text-red-300">Due {formatDate(item.dueDate)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/financials?tab=receipts&tenantId=${item.id}`)}
                        >
                          Review payment
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleAddLease}>
                          Review lease
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100">Lease follow-up</h3>
                  <Badge variant="secondary">{dashboardData.expiringLeases.length}</Badge>
                </div>
                {dashboardData.expiringLeases.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                    No active leases need review right now.
                  </div>
                ) : (
                  dashboardData.expiringLeases.map((lease) => (
                    <div
                      key={lease.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-50">{lease.propertyName}</p>
                          <p className="text-sm text-zinc-400">{lease.tenantName}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Ends {formatDate(lease.endDate)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-white/10 bg-zinc-950/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Recent payments</CardTitle>
                  <p className="mt-1 text-sm text-zinc-400">
                    Latest payment activity across the portfolio.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/financials?tab=receipts")}
                >
                  See all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.recentPayments.length === 0 ? (
                  <p className="text-sm text-zinc-400">No payments recorded yet.</p>
                ) : (
                  dashboardData.recentPayments.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div>
                        <p className="font-medium text-zinc-50">{receipt.tenantName}</p>
                        <p className="text-sm text-zinc-400">{receipt.propertyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-zinc-50">
                          {formatCurrency(receipt.amount)}
                        </p>
                        <p className="text-xs text-zinc-400">{formatDate(receipt.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-zinc-950/70">
              <CardHeader>
                <CardTitle>Owner highlights</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">
                  Keep rent, leases, and receipt output moving without leaving the dashboard.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-zinc-400">Tracked tenants</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-50">{tenants.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-zinc-400">Active leases</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-50">
                    {leases.filter((lease) => lease.status === "active").length}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate("/portfolio")}>
                    Open portfolio
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/documents")}>
                    Open documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  const tenant = dashboardData.tenant;
  const activeLease = dashboardData.activeLease;
  const home = dashboardData.home;
  const paidReceipts = dashboardData.paidReceipts;
  const nextRent = activeLease?.monthlyRent ?? tenant?.rent ?? 0;
  const paymentStatus = tenant?.paymentStatus ?? "pending";
  const statusTone =
    paymentStatus === "paid"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : paymentStatus === "overdue"
        ? "border-red-500/20 bg-red-500/10 text-red-100"
        : "border-amber-500/20 bg-amber-500/10 text-amber-100";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.25),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 shadow-2xl shadow-black/20">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-zinc-200">
              <ShieldCheck className="h-4 w-4" />
              Tenant workspace
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
                Keep your lease, payments, and shared documents in one calm place.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Review the next rent amount, confirm your lease details, and open the latest
                receipts without digging through owner-focused tools.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ActionTile
                title="Review payments"
                subtitle="Open your payment history and receipts."
                icon={CreditCard}
                onClick={() => navigate("/financials")}
              />
              <ActionTile
                title="Open documents"
                subtitle="Download your latest lease and receipts."
                icon={FileText}
                onClick={() => navigate("/documents")}
              />
              <ActionTile
                title="View lease"
                subtitle="Check term, rent, and renewal details."
                icon={Receipt}
                onClick={() => navigate("/leases")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Next rent"
              value={formatCurrency(nextRent)}
              subtitle={`Upcoming payment target for ${formatDate(dashboardData.nextPaymentDate.toISOString())}`}
              icon={BadgeEuro}
              tone="info"
            />
            <MetricCard
              title="Receipts available"
              value={`${paidReceipts.length}`}
              subtitle="Paid records you can review or download"
              icon={FileText}
              tone="success"
            />
            <Card className={cn("border shadow-sm", statusTone)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-300">Payment status</p>
                    <p className="mt-2 text-3xl font-semibold capitalize tracking-tight text-zinc-50">
                      {paymentStatus}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3">
                    <AlertTriangle className="h-5 w-5 text-zinc-100" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-zinc-300">
                  {paymentStatus === "paid"
                    ? "Your latest rent record is marked as received."
                    : paymentStatus === "overdue"
                      ? "A payment needs attention. Review your receipts or contact the owner."
                      : "Your next payment is pending. Review your recent payment history."}
                </p>
              </CardContent>
            </Card>
            <MetricCard
              title="Lease ends"
              value={activeLease ? formatDate(activeLease.endDate) : "—"}
              subtitle="Current contract end date"
              icon={CalendarClock}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-zinc-950/70">
          <CardHeader>
            <CardTitle>My lease</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">
              Everything you need about your current home and agreement.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Home className="h-5 w-5 text-zinc-100" />
                </div>
                <div>
                  <p className="font-medium text-zinc-50">{home?.name ?? "Your property"}</p>
                  <p className="text-sm text-zinc-400">
                    {home?.address ?? "Address not available"}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Monthly rent</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-50">
                    {formatCurrency(nextRent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Lease status</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-zinc-50">
                    {activeLease?.status ?? "Active"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Start date</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {formatDate(activeLease?.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">End date</p>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {formatDate(activeLease?.endDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-50">What you can do now</p>
                  <p className="text-sm text-zinc-400">
                    Open the main tenant tasks directly from here.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-blue-300" />
              </div>
              <div className="mt-4 grid gap-3">
                <Button onClick={() => navigate("/financials")} className="justify-between">
                  Payment history
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/documents")}
                  className="justify-between"
                >
                  Shared documents
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/portfolio")}
                  className="justify-between"
                >
                  Property overview
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-zinc-950/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent receipts</CardTitle>
              <p className="mt-1 text-sm text-zinc-400">
                Latest payment confirmations linked to your lease.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/financials")}>
              Open all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {paidReceipts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                No receipts are available yet.
              </div>
            ) : (
              paidReceipts.slice(0, 4).map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div>
                    <p className="font-medium text-zinc-50">{receipt.propertyName}</p>
                    <p className="text-sm text-zinc-400">{formatDate(receipt.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-zinc-50">{formatCurrency(receipt.amount)}</p>
                    <p className="text-xs capitalize text-zinc-400">{receipt.type}</p>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-sm font-medium text-blue-100">Need help?</p>
              <p className="mt-1 text-sm text-blue-200/80">
                Use your lease and receipt history as the source of truth before contacting the
                owner.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
