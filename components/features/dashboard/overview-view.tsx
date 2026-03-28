"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Trophy,
  Sun,
  Sunset,
  Moon,
  Keyboard,
  X,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Zap,
  Wrench,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, DonutChart } from "@/components/ui/charts";
import {
  DashboardGrid,
  ChartWidget,
  ListWidget,
} from "@/components/ui/dashboard-widgets";
import { AttentionNeeded } from "@/components/ui/quick-actions";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useApp } from "@/lib/contexts/app-context";
import { AchievementGrid } from "@/components/ui/achievements";
import {
  OnboardingChecklist,
  getDefaultOnboardingSteps,
} from "@/components/ui/onboarding-checklist";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils/utils";
import { tokens } from "@/lib/design-tokens";

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

function getGreetingKey(): {
  key: "morning" | "afternoon" | "evening" | "night";
  icon: typeof Sun;
} {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { key: "morning", icon: Sun };
  if (hour >= 12 && hour < 17) return { key: "afternoon", icon: Sun };
  if (hour >= 17 && hour < 21) return { key: "evening", icon: Sunset };
  return { key: "night", icon: Moon };
}

/* ─── Stat Card ─────────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  accent?: string;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  accent = "text-[var(--color-primary)]",
}: StatCardProps) {
  return (
    <div className="card-elevated rounded-xl p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-secondary)]">
          <Icon className={cn("h-5 w-5", accent)} />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              change > 0
                ? "text-[var(--color-success)] bg-[var(--color-success-muted)]"
                : change < 0
                  ? "text-[var(--color-destructive)] bg-[var(--color-error-muted)]"
                  : "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]",
            )}
          >
            {change > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : change < 0 ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
        {value}
      </p>
      <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
        {title}
      </p>
    </div>
  );
}

/* ─── Quick Action Hero Button ──────────────────────── */
interface QuickActionHeroProps {
  label: string;
  description: string;
  icon: React.ElementType;
  onClick?: () => void;
  primary?: boolean;
  shortcut?: string;
  testId?: string;
}

function QuickActionHero({
  label,
  description,
  icon: Icon,
  onClick,
  primary,
  shortcut,
  testId,
}: QuickActionHeroProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "relative flex items-start gap-4 p-5 rounded-xl text-left w-full transition-all duration-200",
        "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        primary
          ? `bg-gradient-to-br from-[var(--color-primary)] to-[${tokens.accentSecondary}] text-white border-transparent shadow-lg animate-glow-pulse`
          : "card-elevated hover:border-[var(--color-inner-border-active)]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-11 h-11 rounded-lg shrink-0",
          primary ? "bg-white/20" : "bg-[var(--color-secondary)]",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            primary ? "text-white" : "text-[var(--color-primary)]",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-semibold text-sm",
              primary ? "text-white" : "text-[var(--color-foreground)]",
            )}
          >
            {label}
          </span>
          {shortcut && (
            <kbd
              className={cn(
                "hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded",
                primary
                  ? "bg-white/20 text-white/80"
                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
              )}
            >
              {shortcut}
            </kbd>
          )}
        </div>
        <p
          className={cn(
            "text-xs mt-0.5",
            primary ? "text-white/70" : "text-[var(--color-muted-foreground)]",
          )}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 mt-1 opacity-40 transition-opacity",
          primary ? "text-white" : "text-[var(--color-muted-foreground)]",
        )}
      />
    </motion.button>
  );
}

/* ─── Property Row ──────────────────────────────────── */
function PropertyRow({
  property,
  formatCurrency,
}: {
  property: {
    id: string;
    name: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    rent: number;
  };
  formatCurrency: (n: number) => string;
}) {
  const statusColors: Record<string, string> = {
    occupied:
      "bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]/20",
    vacant:
      "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
    maintenance:
      "bg-[var(--color-error-muted)] text-[var(--color-destructive)] border-[var(--color-destructive)]/20",
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-[var(--color-hover)] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--color-secondary)] shrink-0">
          <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
            {property.name}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {property.bedrooms} bed · {property.bathrooms} bath ·{" "}
            {formatCurrency(property.rent)}/mo
          </p>
        </div>
      </div>
      <Badge
        className={cn(
          "text-xs border shrink-0",
          statusColors[property.status] || statusColors.vacant,
        )}
      >
        {property.status}
      </Badge>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────── */
export interface OverviewViewProps {
  onAddProperty?: () => void;
  onAddTenant?: () => void;
  onAddLease?: () => void;
  onRecordPayment?: () => void;
  onCreateTicket?: () => void;
  onSendCorrespondence?: () => void;
}

export function OverviewView({
  onAddProperty,
  onAddTenant,
  onAddLease,
  onRecordPayment,
  onCreateTicket,
  onSendCorrespondence,
}: OverviewViewProps = {}): React.ReactElement {
  const { state, refreshData } = useApp();
  const { properties, tenants, receipts, maintenance } = state;
  const isLoading = state.loading;
  const { formatCurrency } = useCurrency();
  const t = useTranslations();
  const { data: session } = useSession();
  const greetingInfo = useMemo(() => getGreetingKey(), []);
  const GreetingIcon = greetingInfo.icon;
  const greetingText = t(`greeting.${greetingInfo.key}`);
  const userName = session?.user?.name?.split(" ")[0] || "there";
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        key: "p",
        ctrl: true,
        action: () => onAddProperty?.(),
        description: t("quickActions.addProperty"),
      },
      {
        key: "t",
        ctrl: true,
        action: () => onAddTenant?.(),
        description: t("quickActions.addTenant"),
      },
      {
        key: "l",
        ctrl: true,
        action: () => onAddLease?.(),
        description: t("quickActions.createLease"),
      },
      {
        key: "r",
        ctrl: true,
        action: () => onRecordPayment?.(),
        description: t("quickActions.recordPayment"),
      },
      {
        key: "m",
        ctrl: true,
        action: () => onCreateTicket?.(),
        description: t("quickActions.maintenanceTicket"),
      },
      {
        key: "/",
        action: () => setShowShortcuts((prev) => !prev),
        description: "Toggle shortcuts",
      },
      {
        key: "r",
        shift: true,
        action: handleRefresh,
        description: "Refresh data",
      },
    ],
    [
      onAddProperty,
      onAddTenant,
      onAddLease,
      onRecordPayment,
      onCreateTicket,
      handleRefresh,
      t,
    ],
  );

  useKeyboardShortcuts({ shortcuts });

  // ─── Computed stats ──────────────────────────────────
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(
    (p) => p.status === "occupied",
  ).length;
  const vacantProperties = properties.filter(
    (p) => p.status === "vacant",
  ).length;
  const activeTenants = tenants.length;
  const overduePayments = tenants.filter(
    (t) => t.paymentStatus === "overdue",
  ).length;
  const openTickets = maintenance.filter(
    (m) => m.status === "open" || m.status === "in_progress",
  ).length;

  const monthlyRevenue = receipts
    .filter((r) => r.status === "paid" && r.type === "rent")
    .reduce((sum, r) => sum + r.amount, 0);

  const occupancyRate =
    totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

  // Monthly revenue trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthReceipts = receipts.filter((r) => {
        const d = new Date(r.date);
        return (
          d.getMonth() === targetDate.getMonth() &&
          d.getFullYear() === targetDate.getFullYear() &&
          r.status === "paid" &&
          r.type === "rent"
        );
      });
      trend.push({
        label: t(`calendar.months.${MONTH_KEYS[targetDate.getMonth()]}`),
        value: monthReceipts.reduce((sum, r) => sum + r.amount, 0),
      });
    }
    return trend;
  }, [receipts, t]);

  // Property type distribution
  const propertyTypeData = useMemo(() => {
    const types = properties.reduce<Record<string, number>>((acc, p) => {
      const type = p.type || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const colors: Record<string, string> = {
      apartment: tokens.chartPropertyType.apartment,
      house: tokens.chartPropertyType.house,
      commercial: tokens.chartPropertyType.commercial,
      other: tokens.chartPropertyType.other,
    };
    return Object.entries(types).map(([type, count]) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: count as number,
      color: colors[type] || colors.other,
    }));
  }, [properties]);

  // Recent payments
  const recentPayments = useMemo(
    () =>
      receipts
        .filter((r) => r.status === "paid")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [receipts],
  );

  // Recent activities
  const recentActivities = useMemo(
    () =>
      recentPayments
        .map((payment) => ({
          id: payment.id,
          type: "payment" as const,
          message: `Payment received from ${payment.propertyName}`,
          amount: payment.amount,
          timestamp: payment.date,
          icon: "💰",
        }))
        .slice(0, 5),
    [recentPayments],
  );

  // Recent properties
  const recentProperties = useMemo(
    () =>
      [...properties]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [properties],
  );

  // Attention items
  const attentionItems = useMemo(
    () => [
      ...(overduePayments > 0
        ? [
            {
              id: "overdue-payments",
              type: "overdue" as const,
              title: "Overdue Payments",
              description: `${overduePayments} tenant${overduePayments > 1 ? "s have" : " has"} overdue payments`,
              count: overduePayments,
              urgency: (overduePayments > 3 ? "high" : "medium") as
                | "high"
                | "medium"
                | "low",
              actionLabel: "View",
            },
          ]
        : []),
      ...(vacantProperties > 0
        ? [
            {
              id: "vacant-properties",
              type: "vacancy" as const,
              title: "Vacant Properties",
              description: `${vacantProperties} propert${vacantProperties > 1 ? "ies are" : "y is"} currently vacant`,
              count: vacantProperties,
              urgency: (vacantProperties > 2 ? "medium" : "low") as
                | "high"
                | "medium"
                | "low",
              actionLabel: "View",
            },
          ]
        : []),
      ...(openTickets > 0
        ? [
            {
              id: "open-tickets",
              type: "maintenance" as const,
              title: "Open Tickets",
              description: `${openTickets} maintenance ticket${openTickets > 1 ? "s" : ""} pending`,
              count: openTickets,
              urgency: (openTickets > 3 ? "high" : "low") as
                | "high"
                | "medium"
                | "low",
              actionLabel: "View",
            },
          ]
        : []),
    ],
    [overduePayments, vacantProperties, openTickets],
  );

  // Onboarding
  const hasProperties = totalProperties > 0;
  const hasPayments = receipts.length > 0;
  const hasTenants = activeTenants > 0;
  const hasActivities = recentActivities.length > 0;

  const onboardingSteps = useMemo(
    () => [
      {
        id: "property",
        label: "Add your first property",
        completed: hasProperties,
      },
      { id: "tenant", label: "Add a tenant", completed: hasTenants },
      { id: "payment", label: "Record a payment", completed: hasPayments },
    ],
    [hasProperties, hasTenants, hasPayments],
  );

  const completedSteps = onboardingSteps.filter((s) => s.completed).length;
  const isOnboardingComplete = completedSteps === onboardingSteps.length;

  // Property status summary
  const propertyStatus = properties.slice(0, 3);

  // Loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Keyboard Shortcuts Panel ─── */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-popover"
          >
            <Card className="w-72 glass-modal">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    Keyboard Shortcuts
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowShortcuts(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2 text-sm">
                  {shortcuts
                    .filter((s) => s.description !== "Toggle shortcuts")
                    .map((shortcut) => (
                      <div
                        key={
                          shortcut.key +
                          (shortcut.ctrl ? "c" : "") +
                          (shortcut.shift ? "s" : "")
                        }
                        className="flex items-center justify-between"
                      >
                        <span className="text-[var(--color-muted-foreground)]">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs font-mono">
                          {shortcut.ctrl ? "⌘" : ""}
                          {shortcut.shift ? "⇧" : ""}
                          {shortcut.key.toUpperCase()}
                        </kbd>
                      </div>
                    ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                    <span className="text-[var(--color-muted-foreground)]">
                      Toggle this panel
                    </span>
                    <kbd className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs font-mono">
                      /
                    </kbd>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] mb-1">
            <GreetingIcon className="h-4 w-4 text-amber-500" />
            <span>
              {greetingText}, {userName}
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span className="text-xs">
              Updated{" "}
              {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <h2 className="text-display-small font-bold tracking-tight text-[var(--color-foreground)]">
            {t("navigation.home") || "Home"}
          </h2>
          <p className="text-body-medium text-[var(--color-muted-foreground)] mt-1">
            {t("dashboard.welcome")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="h-9 w-9 p-0"
            variant="ghost"
            onClick={() => setShowShortcuts((prev) => !prev)}
            title="Keyboard shortcuts (/)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh data (Shift+R)"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* ─── Onboarding ─── */}
      {!isOnboardingComplete && (
        <OnboardingChecklist
          steps={getDefaultOnboardingSteps({
            hasProperties,
            hasTenants,
            hasPayments,
            onAddProperty,
            onAddTenant,
            onRecordPayment,
          })}
        />
      )}

      {/* ─── Attention Needed ─── */}
      {attentionItems.length > 0 && <AttentionNeeded items={attentionItems} />}

      {/* ─── Quick Actions — HERO SECTION ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
            {t("quickActions.title")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickActionHero
            label={t("quickActions.addProperty")}
            description={t("quickActions.addPropertyDesc")}
            icon={Building2}
            onClick={onAddProperty}
            primary
            shortcut="⌘P"
            testId="add-property-btn"
          />
          <QuickActionHero
            label={t("quickActions.addTenant")}
            description={t("quickActions.addTenantDesc")}
            icon={Users}
            onClick={onAddTenant}
            shortcut="⌘T"
          />
          <QuickActionHero
            label={t("quickActions.recordPayment")}
            description={t("quickActions.recordPaymentDesc")}
            icon={DollarSign}
            onClick={onRecordPayment}
            shortcut="⌘R"
            testId="record-payment-btn"
          />
          <QuickActionHero
            label={t("quickActions.createLease")}
            description={t("quickActions.createLeaseDesc")}
            icon={FileText}
            onClick={onAddLease}
            testId="add-lease-btn"
          />
          <QuickActionHero
            label={t("quickActions.maintenanceTicket")}
            description={t("quickActions.maintenanceTicketDesc")}
            icon={Wrench}
            onClick={onCreateTicket}
          />
          <QuickActionHero
            label={t("quickActions.sendCorrespondence")}
            description={t("quickActions.sendCorrespondenceDesc")}
            icon={Mail}
            onClick={onSendCorrespondence}
          />
        </div>
      </section>

      {/* ─── Stats Grid ─── */}
      {hasProperties ? (
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider mb-4">
            {t("dashboard.portfolioOverview")}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("dashboard.totalProperties")}
              value={totalProperties}
              icon={Building2}
            />
            <StatCard
              title={t("dashboard.activeTenants")}
              value={activeTenants}
              icon={Users}
              accent="text-purple-400"
            />
            <StatCard
              title={t("dashboard.monthlyRevenue")}
              value={formatCurrency(monthlyRevenue)}
              icon={DollarSign}
              accent="text-emerald-400"
            />
            <StatCard
              title={t("dashboard.occupancyRate")}
              value={`${occupancyRate.toFixed(1)}%`}
              icon={TrendingUp}
              accent="text-amber-400"
            />
          </div>
        </section>
      ) : (
        <EmptyStateIllustration
          type="properties"
          title={t("dashboard.startManagingPortfolio")}
          description={t("dashboard.startManagingPortfolioDesc")}
          onAction={onAddProperty}
          actionLabel={t("dashboard.addYourFirstProperty")}
        />
      )}

      {/* ─── Charts ─── */}
      {hasProperties && (
        <DashboardGrid columns={2} gap={6}>
          {hasPayments && (
            <ChartWidget
              title={t("charts.revenueTrend")}
              subtitle={t("charts.revenueTrend")}
              chart={
                <LineChart
                  data={monthlyTrend}
                  height={200}
                  showValues={false}
                />
              }
            />
          )}

          <ChartWidget
            title={t("charts.propertyDistribution")}
            subtitle={t("dashboard.portfolioBreakdown")}
            chart={
              propertyTypeData.length > 0 ? (
                <DonutChart data={propertyTypeData} height={200} />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-[var(--color-muted-foreground)]">
                  <p className="text-sm">{t("dashboard.noPropertyData")}</p>
                </div>
              )
            }
          />
        </DashboardGrid>
      )}

      {/* ─── Recent Properties ─── */}
      {hasProperties && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
              {t("dashboard.recentProperties")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              {t("dashboard.viewAll")}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <Card className="card-elevated rounded-xl overflow-hidden">
            <CardContent className="p-2">
              {recentProperties.length > 0 ? (
                <div className="divide-y divide-[var(--color-border)]">
                  {recentProperties.map((property) => (
                    <PropertyRow
                      key={property.id}
                      property={property}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              ) : (
                <EmptyStateIllustration
                  type="properties"
                  compact
                  onAction={onAddProperty}
                  actionLabel={t("quickActions.addProperty")}
                />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ─── Recent Activities ─── */}
      <DashboardGrid columns={1} gap={6}>
        <ListWidget
          title={t("dashboard.recentActivities")}
          subtitle={
            hasActivities
              ? t("dashboard.latestPortfolioUpdates")
              : t("dashboard.activityFeedPlaceholder")
          }
          items={recentActivities}
          renderItem={(activity) => (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-lg">{activity.icon}</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {activity.message}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span>{activity.type}</span>
                    {activity.amount && (
                      <span>· {formatCurrency(activity.amount)}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {new Date(activity.timestamp).toLocaleDateString()}
              </span>
            </div>
          )}
          emptyState={
            <div className="flex flex-col items-center py-8 text-center">
              <div className="rounded-full bg-[var(--color-secondary)] p-3 mb-3">
                <TrendingUp className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <p className="font-medium mb-1">{t("dashboard.noActivity")}</p>
              <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
                {hasProperties
                  ? t("dashboard.addTenantsToSeeActivity")
                  : t("dashboard.addPropertiesToStart")}
              </p>
            </div>
          }
        />
      </DashboardGrid>

      {/* ─── Achievements ─── */}
      {isOnboardingComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("dashboard.achievements")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.achievementsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AchievementGrid
                occupancyRate={occupancyRate}
                totalPayments={receipts.length}
                totalProperties={totalProperties}
                overduePayments={overduePayments}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Recent Payments + Property Status ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>{t("dashboard.recentPayments")}</CardTitle>
            <CardDescription>
              {t("dashboard.latestTenantPayments")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {payment.tenantName}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {payment.propertyName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge variant="success" className="text-xs">
                      {t("dashboard.paid")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyStateIllustration
                type="payments"
                compact
                onAction={onRecordPayment}
                actionLabel={t("quickActions.recordPayment")}
              />
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>{t("dashboard.propertyStatus")}</CardTitle>
            <CardDescription>
              {t("dashboard.currentPropertyConditions")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {propertyStatus.length > 0 ? (
              propertyStatus.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {property.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {property.bedrooms} bed, {property.bathrooms} bath
                    </p>
                  </div>
                  <Badge
                    variant={
                      property.status === "occupied"
                        ? "success"
                        : property.status === "vacant"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {property.status}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyStateIllustration
                type="properties"
                compact
                onAction={onAddProperty}
                actionLabel={t("quickActions.addProperty")}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
