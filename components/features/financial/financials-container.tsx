"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { FinancialsView } from "./financials-view";
import { PaymentMatrixView } from "./payment-matrix-view";
import { ReceiptsView } from "./receipts-view";
import { TrendingUp, TrendingDown, DollarSign, LayoutGrid, Receipt, Grid3X3 } from "lucide-react";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { ExportButton } from "@/components/ui/export-button";

/**
 * Finance Container - Unified view for money flow management
 * 
 * Information Architecture:
 * - Purpose: Money flow management (income, expenses, invoicing)
 * - Belongs here: Recording transactions, invoice generation, payment status, expense categorization
 * - Forbidden: Reports (use Insights), lease rent amounts (use People), property value (use Assets)
 * - Links to: People (tenant payments), Assets (property expenses), Maintenance (maintenance costs)
 */
export function FinancialsContainer() {
  const [activeTab, setActiveTab] = useTabPersistence('finance', 'overview');
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
      {/* Page Header - Consistent with page type inventory */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Finance
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Track income, expenses, and cash flow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={receipts}
            filename="finance-export"
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'amount', label: 'Amount' },
              { key: 'date', label: 'Date' },
              { key: 'description', label: 'Description' }
            ]}
          />
        </div>
      </div>

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

      {/* Tabs Navigation - Aligned with Finance sub-sections per IA */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Income</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Matrix</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <FinancialsView />
        </TabsContent>

        <TabsContent value="receipts" className="mt-0">
          <ReceiptsView />
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          <PaymentMatrixView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
