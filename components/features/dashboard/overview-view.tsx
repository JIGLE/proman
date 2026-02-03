"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, DollarSign, TrendingUp, Trophy, Plus, CheckCircle2, Circle, Lightbulb, Sun, Sunset, Moon, Keyboard, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, DonutChart } from "@/components/ui/charts";
import { DashboardGrid, StatWidget, ChartWidget, ListWidget } from "@/components/ui/dashboard-widgets";
import { QuickActions, AttentionNeeded } from "@/components/ui/quick-actions";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useApp } from "@/lib/contexts/app-context";
import { ProgressBar } from "@/components/ui/progress";
import { AchievementGrid } from "@/components/ui/achievements";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from 'next-intl';
import { useSession } from "next-auth/react";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { Skeleton } from "@/components/ui/skeleton";

// Helper to get time-based greeting
function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", icon: Sun };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", icon: Sun };
  if (hour >= 17 && hour < 21) return { text: "Good evening", icon: Sunset };
  return { text: "Good night", icon: Moon };
}

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
  const { properties, tenants, receipts } = state;
  const isLoading = state.loading;
  const { formatCurrency } = useCurrency();
  const t = useTranslations();
  const { data: session } = useSession();
  const greeting = useMemo(() => getGreeting(), []);
  const GreetingIcon = greeting.icon;
  const userName = session?.user?.name?.split(' ')[0] || 'there';
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
  const shortcuts = useMemo(() => [
    { key: 'p', ctrl: true, action: () => onAddProperty?.(), description: 'Add Property' },
    { key: 't', ctrl: true, action: () => onAddTenant?.(), description: 'Add Tenant' },
    { key: 'l', ctrl: true, action: () => onAddLease?.(), description: 'Create Lease' },
    { key: 'r', ctrl: true, action: () => onRecordPayment?.(), description: 'Record Payment' },
    { key: 'm', ctrl: true, action: () => onCreateTicket?.(), description: 'Maintenance Ticket' },
    { key: '/', action: () => setShowShortcuts(prev => !prev), description: 'Toggle shortcuts' },
    { key: 'r', shift: true, action: handleRefresh, description: 'Refresh data' },
  ], [onAddProperty, onAddTenant, onAddLease, onRecordPayment, onCreateTicket, handleRefresh]);

  useKeyboardShortcuts({ shortcuts });

  // Calculate stats
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
  const vacantProperties = properties.filter(p => p.status === 'vacant').length;

  const activeTenants = tenants.length;
  const overduePayments = tenants.filter(t => t.paymentStatus === 'overdue').length;

  const monthlyRevenue = receipts
    .filter(r => r.status === 'paid' && r.type === 'rent')
    .reduce((sum, r) => sum + r.amount, 0);

  const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

  // Monthly revenue trend (last 6 months)
  const monthlyTrend = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthReceipts = receipts.filter(r => {
      const receiptDate = new Date(r.date);
      return receiptDate.getMonth() === targetDate.getMonth() && 
             receiptDate.getFullYear() === targetDate.getFullYear() &&
             r.status === 'paid' && r.type === 'rent';
    });
    
    monthlyTrend.push({
      label: targetDate.toLocaleString('default', { month: 'short' }),
      value: monthReceipts.reduce((sum, r) => sum + r.amount, 0)
    });
  }

  // Property type distribution
  const propertyTypes = properties.reduce<Record<string, number>>((acc, property) => {
    const type = property.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const propertyTypeData = Object.entries(propertyTypes).map(([type, count]) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: count as number,
    color: getPropertyTypeColor(type)
  }));

  function getPropertyTypeColor(type: string) {
    const colors: Record<string, string> = {
      apartment: '#3b82f6',
      house: '#10b981',
      commercial: '#f59e0b',
      other: '#6b7280'
    };
    return colors[type] || colors.other;
  }

  // Recent payments (last 5)
  const recentPayments = receipts
    .filter(r => r.status === 'paid')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Recent activities (combining payments, new tenants, etc)
  const recentActivities = [
    ...recentPayments.map(payment => ({
      id: payment.id,
      type: 'payment' as const,
      message: `Payment received from ${payment.propertyName}`,
      amount: payment.amount,
      timestamp: payment.date,
      icon: '💰'
    })),
    // Add more activity types as needed
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 5);

  // Property status summary
  const propertyStatus = properties.slice(0, 3);

  // Attention needed items
  const attentionItems = [
    ...(overduePayments > 0 ? [{
      id: "overdue-payments",
      type: "overdue" as const,
      title: "Overdue Payments",
      description: `${overduePayments} tenant${overduePayments > 1 ? 's have' : ' has'} overdue payments`,
      count: overduePayments,
      urgency: overduePayments > 3 ? "high" as const : "medium" as const,
      actionLabel: "View",
    }] : []),
    ...(vacantProperties > 0 ? [{
      id: "vacant-properties",
      type: "vacancy" as const,
      title: "Vacant Properties",
      description: `${vacantProperties} propert${vacantProperties > 1 ? 'ies are' : 'y is'} currently vacant`,
      count: vacantProperties,
      urgency: vacantProperties > 2 ? "medium" as const : "low" as const,
      actionLabel: "View",
    }] : []),
  ];

  // Determine if we have meaningful data to show
  const hasProperties = totalProperties > 0;
  const hasPayments = receipts.length > 0;
  const hasTenants = activeTenants > 0;
  const hasActivities = recentActivities.length > 0;

  // Onboarding progress calculation
  const onboardingSteps = useMemo(() => [
    { id: 'property', label: 'Add your first property', completed: hasProperties },
    { id: 'tenant', label: 'Add a tenant', completed: hasTenants },
    { id: 'payment', label: 'Record a payment', completed: hasPayments },
  ], [hasProperties, hasTenants, hasPayments]);
  
  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const onboardingProgress = (completedSteps / onboardingSteps.length) * 100;
  const isOnboardingComplete = completedSteps === onboardingSteps.length;

  // Contextual tips based on current state
  const contextualTip = useMemo(() => {
    if (!hasProperties) return "Start by adding your first property to unlock all features.";
    if (!hasTenants) return "Add tenants to your properties to start tracking leases and payments.";
    if (!hasPayments) return "Record your first payment to see revenue analytics.";
    if (overduePayments > 0) return `You have ${overduePayments} overdue payment${overduePayments > 1 ? 's' : ''}. Consider sending reminders.`;
    if (vacantProperties > 0) return `${vacantProperties} propert${vacantProperties > 1 ? 'ies are' : 'y is'} vacant. Time to find new tenants!`;
    return "Great job! Your properties are performing well.";
  }, [hasProperties, hasTenants, hasPayments, overduePayments, vacantProperties]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="hidden lg:flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <DashboardGrid columns={4} gap={6}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </DashboardGrid>
        <DashboardGrid columns={2} gap={6}>
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </DashboardGrid>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Keyboard Shortcuts Panel */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50"
          >
            <Card className="w-72 shadow-lg border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    Keyboard Shortcuts
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowShortcuts(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2 text-sm">
                  {shortcuts.filter(s => s.description !== 'Toggle shortcuts').map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between">
                      <span className="text-[var(--color-muted-foreground)]">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs font-mono">
                        {shortcut.ctrl ? '⌘/' : ''}{shortcut.shift ? '⇧' : ''}{shortcut.key.toUpperCase()}
                      </kbd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                    <span className="text-[var(--color-muted-foreground)]">Toggle this panel</span>
                    <kbd className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs font-mono">/</kbd>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Header with Time-based Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] mb-1">
            <GreetingIcon className="h-4 w-4 text-amber-500" />
            <span>{greeting.text}, {userName}</span>
            <span className="text-xs">•</span>
            <span className="text-xs">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 className="text-display-small font-bold tracking-tight text-[var(--color-foreground)]">
            {t('navigation.home') || 'Home'}
          </h2>
          <p className="text-body-medium text-[var(--color-muted-foreground)] mt-1">{t('dashboard.welcome')}</p>
        </div>
        
        {/* Primary Quick Actions - Only 2 main actions + overflow */}
        <div className="hidden lg:flex items-center gap-2">
          <Button onClick={onAddProperty} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
          <Button onClick={onAddTenant} variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Add Tenant
          </Button>
          <QuickActions 
            variant="compact" 
            className="ml-2"
            showOverflowOnly
            onAddProperty={onAddProperty}
            onAddTenant={onAddTenant}
            onAddLease={onAddLease}
            onRecordPayment={onRecordPayment}
            onCreateTicket={onCreateTicket}
            onSendCorrespondence={onSendCorrespondence}
          />
          <div className="h-6 w-px bg-[var(--color-border)] mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh data (Shift+R)"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0"
            onClick={() => setShowShortcuts(prev => !prev)}
            title="Keyboard shortcuts (/)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions panel for mobile/tablet */}
      <div className="lg:hidden">
        <div className="flex gap-2">
          <Button onClick={onAddProperty} className="flex-1 gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
          <Button onClick={onAddTenant} variant="outline" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Contextual Tip Banner */}
      {!isOnboardingComplete && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
          role="alert"
          aria-live="polite"
        >
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-[var(--color-foreground)]">{contextualTip}</p>
        </motion.div>
      )}

      {/* Attention Needed Panel - only show if there are items */}
      {attentionItems.length > 0 && (
        <AttentionNeeded items={attentionItems} />
      )}

      {/* Onboarding Progress - Show when not complete */}
      {!isOnboardingComplete && (
        <motion.div
          role="region"
          aria-label="Onboarding progress"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-[var(--color-card)] to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {completedSteps}/{onboardingSteps.length} complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProgressBar progress={onboardingProgress} height={8} />
              <div className="grid gap-3 sm:grid-cols-3">
                {onboardingSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      step.completed 
                        ? 'bg-success/10 border-success/30' 
                        : 'bg-[var(--color-background)] border-[var(--color-border)] hover:border-primary/50'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-[var(--color-muted-foreground)] flex-shrink-0" />
                    )}
                    <span className={`text-sm ${step.completed ? 'text-success line-through' : 'text-[var(--color-foreground)]'}`}>
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>
              {!hasProperties && (
                <div className="flex justify-center pt-2">
                  <Button onClick={onAddProperty} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Property
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Enhanced Stats Grid with Widgets - Only show when there's data */}
      {hasProperties && (
        <DashboardGrid columns={4} gap={6}>
          <StatWidget
            title="Total Properties"
            value={totalProperties}
            change={totalProperties > 0 ? 5.2 : undefined}
            icon={Building2}
            changeLabel={totalProperties > 0 ? "vs last month" : undefined}
          />
          
          <StatWidget
            title="Active Tenants"
            value={activeTenants}
            change={activeTenants > 0 ? 2.1 : undefined}
            icon={Users}
            changeLabel={activeTenants > 0 ? "vs last month" : undefined}
          />
          
          <StatWidget
            title="Monthly Revenue"
            value={formatCurrency(monthlyRevenue)}
            change={monthlyRevenue > 0 ? 8.3 : undefined}
            icon={DollarSign}
            changeLabel={monthlyRevenue > 0 ? "vs last month" : undefined}
          />
          
          <StatWidget
            title="Occupancy Rate"
            value={`${occupancyRate.toFixed(1)}%`}
            change={occupancyRate > 0 ? (occupancyRate > 90 ? 1.5 : -2.1) : undefined}
            icon={TrendingUp}
            changeLabel={occupancyRate > 0 ? "vs last month" : undefined}
          />
        </DashboardGrid>
      )}
      
      {/* Charts and Analytics - Only show when there's meaningful data */}
      {hasProperties && (
        <DashboardGrid columns={2} gap={6}>
          {hasPayments && (
            <ChartWidget
              title="Revenue Trend"
              subtitle="Monthly revenue for the last 6 months"
              chart={
                <LineChart
                  data={monthlyTrend}
                  height={200}
                  showValues={false}
                />
              }
              onRefresh={() => console.log('Refresh revenue data')}
              onExport={() => console.log('Export revenue data')}
            />
          )}
          
          <ChartWidget
            title="Property Distribution"
            subtitle="Portfolio breakdown by property type"
            chart={
              propertyTypeData.length > 0 ? (
                <DonutChart
                  data={propertyTypeData}
                  height={200}
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-zinc-400">
                  <p className="text-sm">No property data available</p>
                </div>
              )
            }
          />
        </DashboardGrid>
      )}
      
      {/* Recent Activities - Show onboarding guidance when empty */}
      <DashboardGrid columns={1} gap={6}>
        <ListWidget
          title="Recent Activities"
          subtitle={hasActivities ? "Latest updates across your portfolio" : "Your activity feed will appear here"}
          items={recentActivities}
          renderItem={(activity) => (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-lg">{activity.icon}</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{activity.message}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span>{activity.type}</span>
                    {activity.amount && <span>• ${activity.amount.toLocaleString()}</span>}
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
              <div className="rounded-full bg-primary/10 p-3 mb-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium mb-1">No activity yet</p>
              <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
                {hasProperties 
                  ? "Add tenants and record payments to see activity here"
                  : "Add your first property to get started"}
              </p>
            </div>
          }
        />
      </DashboardGrid>

      {/* Achievements - Only show when onboarding is complete */}
      {isOnboardingComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-foreground)] flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Achievements
              </CardTitle>
              <CardDescription>
                Milestones and recognitions for your property management success
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

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--color-foreground)]">Recent Payments</CardTitle>
            <CardDescription>Latest tenant payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{payment.tenantName}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{payment.propertyName}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-semibold text-[var(--color-foreground)]">{formatCurrency(payment.amount)}</p>
                    <Badge variant="success" className="text-xs">Paid</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[var(--color-muted-foreground)] text-sm">No recent payments</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--color-foreground)]">Property Status</CardTitle>
            <CardDescription>Current property conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {propertyStatus.length > 0 ? (
              propertyStatus.map((property) => (
                <div key={property.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{property.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{property.bedrooms} bed, {property.bathrooms} bath</p>
                  </div>
                  <Badge
                    variant={
                      property.status === 'occupied' ? 'success' :
                      property.status === 'vacant' ? 'secondary' : 'destructive'
                    }
                  >
                    {property.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-[var(--color-muted-foreground)] text-sm">No properties added yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
