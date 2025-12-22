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

export function OverviewView() {
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
            <div className="text-2xl font-bold text-zinc-50">6</div>
            <p className="text-xs text-zinc-400 mt-1">
              4 occupied, 2 vacant
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
            <div className="text-2xl font-bold text-zinc-50">4</div>
            <p className="text-xs text-zinc-400 mt-1">
              1 payment overdue
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
            <div className="text-2xl font-bold text-zinc-50">$19,600</div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+8.2%</span> from last month
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
            <div className="text-2xl font-bold text-zinc-50">66.7%</div>
            <p className="text-xs text-zinc-400 mt-1">
              4 of 6 properties
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-50">John Smith</p>
                <p className="text-xs text-zinc-400">Sunset Villa</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-50">$3,500</p>
                <Badge variant="success" className="text-xs">Paid</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-50">Sarah Johnson</p>
                <p className="text-xs text-zinc-400">Downtown Loft</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-50">$4,200</p>
                <Badge variant="success" className="text-xs">Paid</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-50">Michael Chen</p>
                <p className="text-xs text-zinc-400">Lakeside Condo</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-50">$2,900</p>
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-50">Property Status</CardTitle>
            <CardDescription>Current property conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-50">Mountain Retreat</p>
                <p className="text-xs text-zinc-400">3 bed, 2 bath</p>
              </div>
              <Badge variant="secondary">Vacant</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-50">Urban Studio</p>
                <p className="text-xs text-zinc-400">1 bed, 1 bath</p>
              </div>
              <Badge variant="destructive">Maintenance</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-50">Garden Townhouse</p>
                <p className="text-xs text-zinc-400">3 bed, 2.5 bath</p>
              </div>
              <Badge variant="secondary">Vacant</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
