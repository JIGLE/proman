"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { FinancialsView } from "./financials-view";
import { PaymentMatrixView } from "./payment-matrix-view";
import { ReceiptsView } from "./receipts-view";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useApp } from "@/lib/app-context-db";
import { useCurrency } from "@/lib/currency-context";
import { useMemo } from "react";

export function FinancialsContainer() {
  const [activeTab, setActiveTab] = useTabPersistence('financials', 'overview');
  const { state } = useApp();
  const { receipts, expenses } = state;
  const { formatCurrency } = useCurrency();

  // Calculate summary metrics for the financial summary bar
  const metrics = useMemo(() => {
    const totalRevenue = receipts
      .filter(r => r.type === 'rent' || r.type === 'deposit')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalExpenses = expenses
      .reduce((sum, e) => sum + e.amount, 0);

    const netIncome = totalRevenue - totalExpenses;

    return { totalRevenue, totalExpenses, netIncome };
  }, [receipts, expenses]);

  return (
    <div className="space-y-6">
      {/* Financial Summary Bar - Visible across all tabs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-[var(--color-muted-foreground)]">All income sources</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">{formatCurrency(metrics.totalExpenses)}</div>
            <p className="text-xs text-[var(--color-muted-foreground)]">All expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(metrics.netIncome)}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {metrics.netIncome >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinancialsView />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentMatrixView />
        </TabsContent>

        <TabsContent value="receipts">
          <ReceiptsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
