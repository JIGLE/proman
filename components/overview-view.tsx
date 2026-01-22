"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Building2, Users, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "./ui/badge";
import { useCurrency } from "@/lib/currency-context";
import { useApp } from "@/lib/app-context-db";
import { ProgressRing } from "./ui/progress";
import { AchievementGrid } from "./ui/achievements";
import { motion } from "framer-motion";

export type OverviewViewProps = Record<string, never>

export function OverviewView(): React.ReactElement {
  const { state } = useApp();
  const { properties, tenants, receipts } = state;
  const { formatCurrency } = useCurrency();

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
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
          Dashboard Overview
        </h2>
        <p className="text-zinc-400">Welcome to your property management dashboard</p>
      </div>

      {/* Stats Grid */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -4 }}
        >
          <Card className="hover:border-accent-primary/30 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Properties
              </CardTitle>
              <Building2 className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold text-zinc-50"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                {totalProperties}
              </motion.div>
              <p className="text-xs text-zinc-400 mt-1">
                {occupiedProperties} occupied, {vacantProperties} vacant
              </p>
              <div className="mt-3">
                <ProgressRing
                  progress={occupancyRate}
                  size={40}
                  color="var(--color-progress)"
                  showPercentage={false}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4 }}
        >
          <Card className="hover:border-accent-primary/30 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Active Tenants
              </CardTitle>
              <Users className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold text-zinc-50"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
              >
                {activeTenants}
              </motion.div>
              <p className="text-xs text-zinc-400 mt-1">
                {overduePayments} payment{overduePayments !== 1 ? 's' : ''} overdue
              </p>
              {overduePayments > 0 && (
                <motion.div
                  className="mt-2 text-xs text-red-400 flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  ⚠️ Attention needed
                </motion.div>
              )}
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
                Monthly Revenue
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
