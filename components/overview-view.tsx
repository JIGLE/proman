"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react";
import { Badge } from "./ui/badge";
import { useApp } from "@/lib/app-context-db";

export type OverviewViewProps = Record<string, never>

export function OverviewView(): React.ReactElement {
  const { state } = useApp();
  const { properties, tenants, receipts } = state;

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Properties
            </CardTitle>
            <Building2 className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{totalProperties}</div>
            <p className="text-xs text-zinc-400 mt-1">
              {occupiedProperties} occupied, {vacantProperties} vacant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Active Tenants
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{activeTenants}</div>
            <p className="text-xs text-zinc-400 mt-1">
              {overduePayments} payment{overduePayments !== 1 ? 's' : ''} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">${monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">Current month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Occupancy Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-zinc-400 mt-1">
              {occupiedProperties} of {totalProperties} properties
            </p>
          </CardContent>
        </Card>
      </div>

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
                    <p className="text-sm font-semibold text-zinc-50">${payment.amount.toLocaleString()}</p>
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
