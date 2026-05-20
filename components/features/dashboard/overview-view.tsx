"use client";

import { type ElementType, type ReactElement, useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeEuro,
  Building2,
  CalendarClock,
  FileText,
  Home,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OnboardingChecklist,
  type OnboardingChecklistStep,
} from "@/components/ui/onboarding-checklist";
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

function getNextPaymentDate(leaseStartDate?: string): Date | null {
  if (!leaseStartDate) return null;
  const start = new Date(leaseStartDate);
  if (isNaN(start.getTime())) return null;
  const payDay = start.getDate();
  const today = new Date();
  // Try current month first, then advance if past
  let candidate = new Date(today.getFullYear(), today.getMonth(), payDay);
  if (candidate <= today) {
    candidate = new Date(today.getFullYear(), today.getMonth() + 1, payDay);
  }
  return candidate;
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
    default: "border-[var(--color-border)] bg-[var(--color-card)]",
    danger: "border-[var(--color-destructive)]/20 bg-[var(--color-error-muted)]",
    success: "border-[var(--color-success)]/20 bg-[var(--color-success-muted)]",
    info: "border-[var(--color-info)]/20 bg-[var(--color-info-muted)]",
  };

  return (
    <Card className={cn("overflow-hidden border shadow-sm", toneClasses[tone])}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">{title}</p>
            <p
              className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]"
              aria-live="polite"
            >
              {value}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-hover)] p-3">
            <Icon className="h-5 w-5 text-[var(--color-foreground)]" />
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function FeatureHighlightCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-[var(--color-border)] bg-[var(--color-card)]">
      <CardContent className="p-5">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-info-muted)]">
          <Icon className="h-4 w-4 text-[var(--color-primary)]" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">{description}</p>
      </CardContent>
    </Card>
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
  const t = useTranslations("dashboard");
  const locale = pathname.split("/")[1] || "pt";

  const { properties = [], tenants = [], leases = [], receipts = [], loading } = state;

  const navigate = (href: string) => router.push(`/${locale}${href}`);
  const handleAddProperty = () =>
    onAddProperty?.() ?? navigate("/portfolio?action=create-property");
  const handleAddTenant = () =>
    onAddTenant?.() ?? navigate("/people?view=tenants&action=create-tenant");
  const handleAddLease = () => onAddLease?.() ?? navigate("/leases");
  const handleRecordPayment = () =>
    onRecordPayment?.() ?? navigate("/financials?tab=receipts&action=record-payment");

  const [ownerContact, setOwnerContact] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    if (isOwnerPortal) return;
    fetch("/api/portal/owner-contact")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setOwnerContact(json.data);
      })
      .catch(() => {});
  }, [isOwnerPortal]);

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

    const sixtyDaysFromNow = Date.now() + 60 * 24 * 60 * 60 * 1000;
    const expiringLeases = [...leases]
      .filter((lease) => {
        if (lease.status !== "active") return false;
        const end = Date.parse(lease.endDate);
        return !isNaN(end) && end > Date.now() && end <= sixtyDaysFromNow;
      })
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

    const tenant = tenants.find((t) => t.email === session?.user?.email) ?? tenants[0] ?? null;
    const activeLease = tenant ? getActiveLease(tenant.id, leases) : null;
    const home = properties.find(
      (property) => property.id === (activeLease?.propertyId ?? tenant?.propertyId),
    );
    const paidReceipts = receipts.filter((receipt) => receipt.status === "paid");
    const nextPaymentDate = getNextPaymentDate(activeLease?.startDate);

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
  }, [leases, properties, receipts, tenants, session]);

  const firstName = session?.user?.name?.split(" ")[0] || t("nameFallback");

  const onboardingSteps: OnboardingChecklistStep[] = [
    {
      id: "property",
      label: t("addPropertyLabel"),
      description: t("addPropertyDesc"),
      completed: properties.length > 0,
      icon: Home,
      action: handleAddProperty,
      actionLabel: t("addPropertyAction"),
    },
    {
      id: "tenant",
      label: t("addTenantLabel"),
      description: t("addTenantDesc"),
      completed: tenants.length > 0,
      icon: UserRound,
      action: handleAddTenant,
      actionLabel: t("addTenantAction"),
    },
    {
      id: "lease",
      label: t("createLeaseLabel"),
      description: t("createLeaseDesc"),
      completed: leases.length > 0,
      icon: FileText,
      action: handleAddLease,
      actionLabel: t("createLeaseAction"),
    },
    {
      id: "payment",
      label: t("recordPaymentLabel"),
      description: t("recordPaymentDesc"),
      completed: receipts.length > 0,
      icon: BadgeEuro,
      action: handleRecordPayment,
      actionLabel: t("recordPaymentAction"),
    },
  ];
  const allStepsDone = onboardingSteps.every((s) => s.completed);
  const showChecklist = isOwnerPortal && !allStepsDone;

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-muted)]/30" />;
  }

  if (properties.length === 0 && isOwnerPortal) {
    const richSteps: OnboardingChecklistStep[] = [
      {
        id: "property",
        label: t("addPropertyLabel"),
        description: t("addPropertyDesc2"),
        completed: false,
        icon: Home,
        action: handleAddProperty,
        actionLabel: t("addPropertyAction"),
      },
      {
        id: "tenant",
        label: t("addTenantLabel"),
        description: t("addTenantDesc"),
        completed: false,
        icon: UserRound,
        action: handleAddTenant,
        actionLabel: t("addTenantAction"),
      },
      {
        id: "lease",
        label: t("createLeaseLabel"),
        description: t("createLeaseDesc"),
        completed: false,
        icon: FileText,
        action: handleAddLease,
        actionLabel: t("createLeaseAction"),
      },
      {
        id: "payment",
        label: t("recordPaymentLabel"),
        description: t("recordPaymentDesc"),
        completed: false,
        icon: BadgeEuro,
        action: handleRecordPayment,
        actionLabel: t("recordPaymentAction"),
      },
    ];
    return (
      <div className="space-y-6">
        <OnboardingChecklist steps={richSteps} />
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureHighlightCard
            icon={Building2}
            title={t("featPropertiesTitle")}
            description={t("featPropertiesDesc")}
          />
          <FeatureHighlightCard
            icon={UserRound}
            title={t("featTenantsTitle")}
            description={t("featTenantsDesc")}
          />
          <FeatureHighlightCard
            icon={BadgeEuro}
            title={t("featFinancialsTitle")}
            description={t("featFinancialsDesc")}
          />
        </div>
      </div>
    );
  }

  if (isOwnerPortal) {
    return (
      <div className="space-y-6">
        {showChecklist && <OnboardingChecklist steps={onboardingSteps} />}
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <div className="mb-6 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-info-muted)] px-3 py-1 text-sm text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" />
              {t("dailyOps", { firstName })}
            </div>
            <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {t("ownerTitle")}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
              {t("ownerSubtitle")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              title={t("overdueRentMetric")}
              value={formatCurrency(dashboardData.overdueRent)}
              subtitle={t("tenantsFollowUp", { count: dashboardData.overdueQueue.length })}
              icon={AlertTriangle}
              tone="danger"
            />
            <MetricCard
              title={t("collectedThisMonth")}
              value={formatCurrency(dashboardData.monthlyIncome)}
              subtitle={t("paidRentPosted")}
              icon={BadgeEuro}
              tone="success"
            />
            <MetricCard
              title={t("occupancyMetric")}
              value={`${dashboardData.occupancyRate.toFixed(0)}%`}
              subtitle={t("propertiesTracked", { count: properties.length })}
              icon={Building2}
              tone="info"
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>{t("actionQueue")}</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t("actionQueueSubtitle")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRecordPayment}>
                {t("openPayments")}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t("overdueRentMetric")}
                  </h3>
                  <Badge variant="destructive">{dashboardData.overdueQueue.length}</Badge>
                </div>
                {dashboardData.overdueQueue.length === 0 ? (
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-sm text-[var(--color-muted-foreground)]">
                    {t("noOverduePayments")}
                  </div>
                ) : (
                  dashboardData.overdueQueue.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">
                            {item.tenantName}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {item.propertyName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {formatCurrency(item.amountDue)}
                          </p>
                          <p className="text-xs text-red-300">
                            {t("dueDateLabel", { date: formatDate(item.dueDate) })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/financials?tab=receipts&tenantId=${item.id}`)}
                        >
                          {t("reviewPayment")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleAddLease}>
                          {t("reviewLease")}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t("leaseFollowUp")}
                  </h3>
                  <Badge variant="secondary">{dashboardData.expiringLeases.length}</Badge>
                </div>
                {dashboardData.expiringLeases.length === 0 ? (
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-sm text-[var(--color-muted-foreground)]">
                    {t("noLeasesNeedReview")}
                  </div>
                ) : (
                  dashboardData.expiringLeases.map((lease) => (
                    <div
                      key={lease.id}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">
                            {lease.propertyName}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {lease.tenantName}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {t("endsDate", { date: formatDate(lease.endDate) })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>{t("recentPayments")}</CardTitle>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {t("latestPaymentActivity")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/financials?tab=receipts")}
                >
                  {t("seeAll")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.recentPayments.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {t("noPaymentsRecorded")}
                  </p>
                ) : (
                  dashboardData.recentPayments.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4"
                    >
                      <div>
                        <p className="font-medium text-[var(--color-foreground)]">
                          {receipt.tenantName}
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {receipt.propertyName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--color-foreground)]">
                          {formatCurrency(receipt.amount)}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(receipt.date)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
              <CardHeader>
                <CardTitle>{t("thisWeekActivity")}</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t("thisWeekActivitySubtitle")}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {t("trackedTenants")}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {tenants.length}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {t("activeLeasesCount")}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {leases.filter((lease) => lease.status === "active").length}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate("/portfolio")}>
                    {t("openPortfolio")}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/documents")}>
                    {t("openDocuments")}
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
      <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
        <div className="mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1 text-sm text-[var(--color-muted-foreground)]">
            <ShieldCheck className="h-4 w-4" />
            {t("tenantWorkspaceLabel")}
          </div>
          <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {t("tenantTitle")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            {t("tenantSubtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            title={t("nextRent")}
            value={formatCurrency(nextRent)}
            subtitle={
              dashboardData.nextPaymentDate
                ? t("dueDateLabel", {
                    date: formatDate(dashboardData.nextPaymentDate.toISOString()),
                  })
                : t("noActiveLease")
            }
            icon={BadgeEuro}
            tone="info"
          />
          <Card className={cn("border shadow-sm", statusTone)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm opacity-80">{t("paymentStatusLabel")}</p>
                  <p className="mt-2 text-3xl font-semibold capitalize tracking-tight">
                    {paymentStatus}
                  </p>
                </div>
                <div className="rounded-lg bg-black/10 p-3">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs opacity-80">
                {paymentStatus === "paid"
                  ? t("paymentStatusPaid")
                  : paymentStatus === "overdue"
                    ? t("paymentStatusOverdue")
                    : t("paymentStatusPending")}
              </p>
            </CardContent>
          </Card>
          <MetricCard
            title={t("leaseEnds")}
            value={activeLease ? formatDate(activeLease.endDate) : "—"}
            subtitle={t("leaseEndsSubtitle")}
            icon={CalendarClock}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <CardHeader>
            <CardTitle>{t("myLease")}</CardTitle>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {t("myLeaseSubtitle")}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--color-secondary)] p-3">
                  <Home className="h-5 w-5 text-[var(--color-foreground)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">
                    {home?.name ?? t("yourProperty")}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {home?.address ?? t("addressUnavailable")}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    {t("monthlyRentLabel")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {formatCurrency(nextRent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    {t("leaseStatusLabel")}
                  </p>
                  <p className="mt-1 text-lg font-semibold capitalize text-[var(--color-foreground)]">
                    {activeLease?.status ?? "Active"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    {t("startDateLabel")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                    {formatDate(activeLease?.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    {t("endDateLabel")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                    {formatDate(activeLease?.endDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">
                    {t("whatYouCanDoNow")}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {t("whatYouCanDoNowSubtitle")}
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div className="mt-4 grid gap-3">
                <Button onClick={() => navigate("/financials")} className="justify-between">
                  {t("paymentHistory")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/documents")}
                  className="justify-between"
                >
                  {t("sharedDocuments")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/portfolio")}
                  className="justify-between"
                >
                  {t("propertyOverview")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>{t("recentReceipts")}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("recentReceiptsSubtitle")}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/financials")}>
              {t("openAll")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {paidReceipts.length === 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4 text-sm text-[var(--color-muted-foreground)]">
                {t("noReceiptsYet")}
              </div>
            ) : (
              paidReceipts.slice(0, 4).map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4"
                >
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">
                      {receipt.propertyName}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {formatDate(receipt.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(receipt.amount)}
                    </p>
                    <p className="text-xs capitalize text-[var(--color-muted-foreground)]">
                      {receipt.type}
                    </p>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-lg border border-[var(--color-info-muted)] bg-[var(--color-info-muted)] p-4">
              <p className="text-sm font-medium text-[var(--color-primary)]">{t("needHelp")}</p>
              {ownerContact ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {t("contactOwnerLabel")}
                  </p>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {ownerContact.name}
                  </p>
                  <a
                    href={`mailto:${ownerContact.email}`}
                    className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-foreground)] transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {ownerContact.email}
                  </a>
                  {ownerContact.phone && (
                    <a
                      href={`tel:${ownerContact.phone}`}
                      className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-foreground)] transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {ownerContact.phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t("useLeaseHistory")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
