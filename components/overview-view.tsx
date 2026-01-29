"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Building2, Users, DollarSign, TrendingUp, Trophy, Plus, Home, FileText, AlertTriangle, Calendar } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BarChart, LineChart, DonutChart } from "./ui/charts";
import { DashboardGrid, StatWidget, ChartWidget, ListWidget } from "./ui/dashboard-widgets";
import { useCurrency } from "@/lib/currency-context";
import { useApp } from "@/lib/app-context-db";
import { ProgressRing } from "./ui/progress";
import { AchievementGrid } from "./ui/achievements";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';

export type OverviewViewProps = Record<string, never>

export function OverviewView(): React.ReactElement {
  const { state } = useApp();
  const { properties, tenants, receipts } = state;
  const { formatCurrency } = useCurrency();
  const t = useTranslations();

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

  // Recent payments (last 5)
  const recentPayments = receipts
    .filter(r => r.status === 'paid')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Property status summary
  const propertyStatus = properties.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
            <Home className="h-4 w-4" />
            <span>Proman</span>
            <span>/</span>
            <span className="text-zinc-200">Dashboard</span>
          </div>
          <h2 className="text-display-small font-bold tracking-tight text-zinc-50">
            {t('navigation.dashboard')} Overview
          </h2>
          <p className="text-body-medium text-zinc-400 mt-1">{t('dashboard.welcome')}</p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="text-zinc-400 hover:text-zinc-50">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Grid with Widgets */}
      <DashboardGrid columns={4} gap={6}>
        <StatWidget
          title="Total Properties"
          value={totalProperties}
          change={5.2}
          icon={Building2}
          changeLabel="vs last month"
        />
        
        <StatWidget
          title="Active Tenants"
          value={activeTenants}
          change={2.1}
          icon={Users}
          changeLabel="vs last month"
        />
        
        <StatWidget
          title="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          change={8.3}
          icon={DollarSign}
          changeLabel="vs last month"
        />
        
        <StatWidget
          title="Occupancy Rate"
          value={`${occupancyRate.toFixed(1)}%`}
          change={occupancyRate > 90 ? 1.5 : -2.1}
          icon={TrendingUp}
          changeLabel="vs last month"
        />
      </DashboardGrid>
      
      {/* Charts and Analytics */}
      <DashboardGrid columns={2} gap={6}>
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
      
      {/* Recent Activities */}
      <DashboardGrid columns={1} gap={6}>
        <ListWidget
          title="Recent Activities"
          subtitle="Latest updates across your portfolio"
          items={recentActivities}
          renderItem={(activity, index) => (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-300">{activity.description}</p>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  {activity.tenant && <span>• {activity.tenant}</span>}
                  {activity.property && <span>• {activity.property}</span>}
                  {activity.amount && <span>• {activity.amount}</span>}
                </div>
              </div>
              <span className="text-xs text-zinc-500">{activity.time}</span>
            </div>
          )}
          emptyMessage="No recent activities"
        />
      </DashboardGrid>

            {/* Tenant Activity */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -4 }}
            >
              <Card className="hover:border-accent-primary/30 transition-colors duration-300 surface-elevated group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-heading-small font-medium text-zinc-400">
                    Active Tenants
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <motion.div
                    className="text-display-medium font-bold text-zinc-50 mb-2"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    {activeTenants}
                  </motion.div>
                  <div className="space-y-2">
                    {overduePayments > 0 ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" size="sm">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {overduePayments} overdue
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="success" size="sm">
                        All payments current
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -4 }}
        >
          <Card className="hover:border-success/30 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {t('dashboard.monthlyRevenue')}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold text-zinc-50"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                {formatCurrency(monthlyRevenue)}
              </motion.div>
              <motion.p
                className="text-xs text-zinc-400 flex items-center gap-1 mt-1"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">Current month</span>
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -4 }}
        >
          <Card className="hover:border-progress/30 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Occupancy Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-progress" />
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold text-zinc-50"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                {occupancyRate.toFixed(1)}%
              </motion.div>
              <p className="text-xs text-zinc-400 mt-1">
                Properties occupied
              </p>
              <div className="mt-3">
                <ProgressRing
                  progress={occupancyRate}
                  size={40}
                  color="var(--color-progress)"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-50 flex items-center gap-2">
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

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-50">Recent Payments</CardTitle>
            <CardDescription>Latest tenant payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-50">{payment.tenantName}</p>
                    <p className="text-xs text-zinc-400">{payment.propertyName}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-semibold text-zinc-50">{formatCurrency(payment.amount)}</p>
                    <Badge variant="success" className="text-xs">Paid</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-400 text-sm">No recent payments</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-50">Property Status</CardTitle>
            <CardDescription>Current property conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {propertyStatus.length > 0 ? (
              propertyStatus.map((property) => (
                <div key={property.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-50">{property.name}</p>
                    <p className="text-xs text-zinc-400">{property.bedrooms} bed, {property.bathrooms} bath</p>
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
              <p className="text-zinc-400 text-sm">No properties added yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
