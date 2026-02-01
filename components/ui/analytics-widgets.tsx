"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { ProgressBar } from "./progress";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Home,
  Wrench,
  FileText,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  trend,
  variant = 'default',
  className
}: KPICardProps) {
  const variantStyles = {
    default: 'border-zinc-700/50',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5'
  };

  const trendIcon = trend === 'up' ? (
    <TrendingUp className="h-4 w-4 text-green-400" />
  ) : trend === 'down' ? (
    <TrendingDown className="h-4 w-4 text-red-400" />
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        variantStyles[variant],
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">{title}</p>
              <p className="text-3xl font-bold text-zinc-50">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {subtitle && (
                <p className="text-xs text-zinc-500">{subtitle}</p>
              )}
            </div>
            {icon && (
              <div className="p-3 rounded-xl bg-zinc-800/50">
                {icon}
              </div>
            )}
          </div>
          
          {(change !== undefined || changeLabel) && (
            <div className="mt-4 flex items-center gap-2">
              {trendIcon}
              {change !== undefined && (
                <span className={cn(
                  "text-sm font-medium",
                  change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-zinc-400"
                )}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              )}
              {changeLabel && (
                <span className="text-xs text-zinc-500">{changeLabel}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Occupancy Gauge Component
interface OccupancyGaugeProps {
  rate: number;
  total: number;
  occupied: number;
  vacant: number;
  className?: string;
}

export function OccupancyGauge({ rate, total, occupied, vacant, className }: OccupancyGaugeProps) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (rate / 100) * circumference;
  
  const getColor = (rate: number) => {
    if (rate >= 90) return '#22c55e'; // green
    if (rate >= 70) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-400" />
          Occupancy Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="140" height="140" className="-rotate-90">
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r="45"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="10"
              />
              {/* Progress circle */}
              <motion.circle
                cx="70"
                cy="70"
                r="45"
                fill="none"
                stroke={getColor(rate)}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl font-bold text-zinc-50">{rate.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-zinc-50">{total}</p>
            <p className="text-xs text-zinc-400">Total Units</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{occupied}</p>
            <p className="text-xs text-zinc-400">Occupied</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{vacant}</p>
            <p className="text-xs text-zinc-400">Vacant</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lease Expiration Timeline
interface LeaseExpirationItem {
  leaseId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  endDate: string;
  daysUntilExpiration: number;
  monthlyRent: number;
  status: 'expired' | 'critical' | 'warning' | 'healthy';
}

interface LeaseExpirationTimelineProps {
  leases: LeaseExpirationItem[];
  className?: string;
  onViewAll?: () => void;
}

export function LeaseExpirationTimeline({ leases, className, onViewAll }: LeaseExpirationTimelineProps) {
  const getStatusConfig = (status: LeaseExpirationItem['status']) => {
    switch (status) {
      case 'expired':
        return { color: 'bg-red-500', textColor: 'text-red-400', label: 'Expired', icon: AlertTriangle };
      case 'critical':
        return { color: 'bg-orange-500', textColor: 'text-orange-400', label: '< 30 days', icon: Clock };
      case 'warning':
        return { color: 'bg-yellow-500', textColor: 'text-yellow-400', label: '30-60 days', icon: Calendar };
      default:
        return { color: 'bg-green-500', textColor: 'text-green-400', label: '> 60 days', icon: CheckCircle2 };
    }
  };

  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-400" />
          Upcoming Lease Expirations
        </CardTitle>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        {leases.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No upcoming lease expirations</p>
        ) : (
          leases.slice(0, 5).map((lease, index) => {
            const config = getStatusConfig(lease.status);
            const StatusIcon = config.icon;
            
            return (
              <motion.div
                key={lease.leaseId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
              >
                <div className={cn("w-2 h-12 rounded-full", config.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {lease.tenantName}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {lease.propertyName} - Unit {lease.unitNumber}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <StatusIcon className={cn("h-4 w-4", config.textColor)} />
                    <span className={cn("text-sm font-medium", config.textColor)}>
                      {lease.daysUntilExpiration < 0 
                        ? `${Math.abs(lease.daysUntilExpiration)} days ago`
                        : `${lease.daysUntilExpiration} days`
                      }
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {new Date(lease.endDate).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// Maintenance Status Card
interface MaintenanceStatsProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    averageResolutionDays: number;
  };
  className?: string;
}

export function MaintenanceStatusCard({ stats, className }: MaintenanceStatsProps) {
  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-400" />
          Maintenance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-zinc-800/30">
            <p className="text-2xl font-bold text-zinc-50">{stats.total}</p>
            <p className="text-xs text-zinc-400">Total Requests</p>
          </div>
          {stats.urgent > 0 && (
            <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-2xl font-bold text-red-400">{stats.urgent}</p>
              <p className="text-xs text-red-400">Urgent</p>
            </div>
          )}
          {stats.urgent === 0 && (
            <div className="text-center p-3 rounded-lg bg-zinc-800/30">
              <p className="text-2xl font-bold text-zinc-50">{stats.averageResolutionDays.toFixed(1)}</p>
              <p className="text-xs text-zinc-400">Avg. Days to Resolve</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Completion Rate</span>
            <span className="text-zinc-200 font-medium">{completionRate.toFixed(0)}%</span>
          </div>
          <ProgressBar progress={completionRate} height={8} className="" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
              {stats.pending} Pending
            </Badge>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="text-blue-400 border-blue-400/30">
              {stats.inProgress} In Progress
            </Badge>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="text-green-400 border-green-400/30">
              {stats.completed} Done
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Property Performance Table
interface PropertyPerformanceData {
  propertyId: string;
  propertyName: string;
  address: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  expenses: number;
  netIncome: number;
  roi: number;
}

interface PropertyPerformanceTableProps {
  data: PropertyPerformanceData[];
  formatCurrency: (amount: number) => string;
  className?: string;
}

export function PropertyPerformanceTable({ data, formatCurrency, className }: PropertyPerformanceTableProps) {
  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
          <Home className="h-5 w-5 text-cyan-400" />
          Property Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No properties found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-2 text-xs font-medium text-zinc-400">Property</th>
                  <th className="text-center py-3 px-2 text-xs font-medium text-zinc-400">Occupancy</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-zinc-400">Revenue</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-zinc-400">Net Income</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-zinc-400">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((property, index) => (
                  <motion.tr
                    key={property.propertyId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-zinc-800 hover:bg-zinc-800/30"
                  >
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-zinc-200">{property.propertyName}</p>
                      <p className="text-xs text-zinc-500">{property.totalUnits} units</p>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="inline-flex items-center gap-2">
                        <ProgressBar progress={property.occupancyRate} height={8} className="w-16" />
                        <span className="text-sm text-zinc-300">{property.occupancyRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className="text-sm text-zinc-200">{formatCurrency(property.monthlyRevenue)}</p>
                      <p className="text-xs text-zinc-500">/month</p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className={cn(
                        "text-sm font-medium",
                        property.netIncome >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {formatCurrency(property.netIncome)}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Badge variant={property.roi >= 8 ? "success" : property.roi >= 5 ? "warning" : "destructive"}>
                        {property.roi.toFixed(1)}%
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Stats Row
interface QuickStatsProps {
  stats: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
  }[];
  className?: string;
}

export function QuickStatsRow({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn("flex items-center gap-6 flex-wrap", className)}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", stat.color || "bg-zinc-800")}>
            {stat.icon}
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-50">{stat.value}</p>
            <p className="text-xs text-zinc-400">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
