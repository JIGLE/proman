"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const revenueData = [
  { month: "Jan", revenue: 28400, expenses: 12000 },
  { month: "Feb", revenue: 31200, expenses: 13500 },
  { month: "Mar", revenue: 29800, expenses: 11800 },
  { month: "Apr", revenue: 32400, expenses: 14200 },
  { month: "May", revenue: 30100, expenses: 12900 },
  { month: "Jun", revenue: 33800, expenses: 13100 },
  { month: "Jul", revenue: 35200, expenses: 14500 },
  { month: "Aug", revenue: 34600, expenses: 13800 },
  { month: "Sep", revenue: 36100, expenses: 14900 },
  { month: "Oct", revenue: 37500, expenses: 15200 },
  { month: "Nov", revenue: 35800, expenses: 14100 },
  { month: "Dec", revenue: 38200, expenses: 15800 },
];

const propertyPerformance = [
  { property: "Sunset Villa", revenue: 42000 },
  { property: "Downtown Loft", revenue: 50400 },
  { property: "Mountain Retreat", revenue: 33600 },
  { property: "Urban Studio", revenue: 38400 },
  { property: "Lakeside Condo", revenue: 34800 },
  { property: "Garden Townhouse", revenue: 39600 },
];

export function FinancialsView(): React.ReactElement {
  const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalExpenses = revenueData.reduce((acc, curr) => acc + curr.expenses, 0);
  const netIncome = totalRevenue - totalExpenses;
  const avgMonthlyRevenue = totalRevenue / revenueData.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
          Financial Overview
        </h2>
        <p className="text-zinc-400">Track revenue, expenses, and profitability</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12.5%</span> from last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              ${totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-red-500" />
              <span className="text-red-500">+3.2%</span> from last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Net Income
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              ${netIncome.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+18.7%</span> from last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Avg Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              ${Math.round(avgMonthlyRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Across all properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-50">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly comparison for the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    color: "#fafafa",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-50">Property Performance</CardTitle>
            <CardDescription>Annual revenue by property</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="property"
                  stroke="#71717a"
                  style={{ fontSize: "11px" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    color: "#fafafa",
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
