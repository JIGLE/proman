"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Calendar as CalendarIcon,
  FileText,
  Calculator,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/contexts/app-context";
import { expenseSchema, ExpenseFormData } from "@/lib/utils/validation";
import { cn } from "@/lib/utils/utils";
import { TaxCalculator, TaxCalculationResult } from "@/lib/services/tax-calculator";
import { getExpenseCategoryColor } from "@/lib/design-tokens";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { PageHeader } from "@/components/shared/page-header";

export function FinancialsView(): React.ReactElement {
  const { state, addExpense } = useApp();
  const { properties, receipts, expenses, loading } = state;
  const { formatCurrency } = useCurrency();

  const [timeRange, setTimeRange] = useState("all"); // all, month, year
  const [selectedCountry, setSelectedCountry] = useState<"PT" | "ES">("PT");

  const dialog = useFormDialog<ExpenseFormData>({
    schema: expenseSchema,
    initialData: {
      propertyId: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      category: "",
      description: "",
    },
    onSubmit: async (data) => {
      await addExpense(data);
    },
    successMessage: {
      create: "Expense recorded successfully!",
      update: "Expense updated successfully!",
    },
    errorMessage: "Failed to save expense.",
  });

  // Enhanced Calculations with trends
  const metrics = useMemo(() => {
    let filteredReceipts = receipts;
    let filteredExpenses = expenses;
    let previousReceipts = receipts;
    let previousExpenses = expenses;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Previous period for trend calculation
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    if (timeRange === "month") {
      filteredReceipts = receipts.filter((r) => {
        const date = new Date(r.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      filteredExpenses = expenses.filter((e) => {
        const date = new Date(e.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      // Previous month for trend
      previousReceipts = receipts.filter((r) => {
        const date = new Date(r.date);
        return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
      });
      previousExpenses = expenses.filter((e) => {
        const date = new Date(e.date);
        return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
      });
    } else if (timeRange === "year") {
      filteredReceipts = receipts.filter((r) => new Date(r.date).getFullYear() === currentYear);
      filteredExpenses = expenses.filter((e) => new Date(e.date).getFullYear() === currentYear);

      // Previous year for trend
      previousReceipts = receipts.filter((r) => new Date(r.date).getFullYear() === currentYear - 1);
      previousExpenses = expenses.filter((e) => new Date(e.date).getFullYear() === currentYear - 1);
    }

    const totalIncome = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    // Previous period totals
    const prevIncome = previousReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const prevExpenses = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const prevNetProfit = prevIncome - prevExpenses;

    // Calculate trends
    const incomeTrend = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    const expensesTrend =
      prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const profitTrend =
      prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;

    // Group expenses by category
    const expensesByCategory = filteredExpenses.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthReceipts = receipts.filter((r) => {
        const receiptDate = new Date(r.date);
        return (
          receiptDate.getMonth() === targetDate.getMonth() &&
          receiptDate.getFullYear() === targetDate.getFullYear()
        );
      });

      monthlyRevenue.push({
        label: targetDate.toLocaleString("default", { month: "short" }),
        value: monthReceipts.reduce((sum, r) => sum + r.amount, 0),
      });
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
      incomeTrend,
      expensesTrend,
      profitTrend,
      expensesByCategory,
      monthlyRevenue,
      totalProperties: properties.length,
      avgRevenuePerProperty: properties.length > 0 ? totalIncome / properties.length : 0,
      filteredReceipts,
      filteredExpenses,
    };
  }, [receipts, expenses, properties, timeRange]);

  const getCategoryColor = (category: string) => getExpenseCategoryColor(category);

  // Prepare chart data
  const _expenseCategoryData = Object.entries(metrics.expensesByCategory).map(
    ([category, amount]) => ({
      label: category.charAt(0).toUpperCase() + category.slice(1),
      value: amount,
      color: getCategoryColor(category),
    }),
  );

  // Tax Calculations
  const taxCalculation = useMemo((): TaxCalculationResult | null => {
    if (timeRange !== "year") return null;

    const annualIncome = metrics.totalIncome;
    const annualExpenses = metrics.totalExpenses;

    try {
      return TaxCalculator.calculateTax({
        country: selectedCountry,
        regime: selectedCountry === "PT" ? "portugal_rendimentos" : "spain_inmuebles",
        annualRentalIncome: annualIncome,
        deductibleExpenses: annualExpenses,
      });
    } catch (error) {
      console.error("Tax calculation error:", error);
      return null;
    }
  }, [metrics, selectedCountry, timeRange]);

  const categories = [
    "Maintenance",
    "Repairs",
    "Utilities",
    "Insurance",
    "Taxes",
    "Mortgage",
    "Management Fees",
    "Other",
  ];

  return (
    <>
      {loading ? (
        <LoadingState variant="cards" count={6} />
      ) : receipts.length === 0 && expenses.length === 0 ? (
        <div className="space-y-6">
          <PageHeader title="Financials" description="Track income, expenses, and cash flow" />
          <EmptyStateIllustration
            type="expenses"
            title="No financial data yet"
            description="Start by adding receipts or expenses to track your cash flow"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <PageHeader title="Financials" description="Track income, expenses, and cash flow">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
              <DialogTrigger asChild>
                <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                  <DialogDescription>
                    Add a new property expense to track your spending
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={dialog.handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property">Property</Label>
                      <Select
                        value={dialog.formData.propertyId}
                        onValueChange={(val) => dialog.updateFormData({ propertyId: val })}
                      >
                        <SelectTrigger
                          id="property"
                          className={dialog.formErrors.propertyId ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dialog.formErrors.propertyId && (
                        <p className="text-sm text-destructive">{dialog.formErrors.propertyId}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={dialog.formData.category}
                        onValueChange={(val) => dialog.updateFormData({ category: val })}
                      >
                        <SelectTrigger
                          id="category"
                          className={dialog.formErrors.category ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dialog.formErrors.category && (
                        <p className="text-sm text-destructive">{dialog.formErrors.category}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={dialog.formData.amount || ""}
                        onChange={(e) =>
                          dialog.updateFormData({
                            amount: parseFloat(e.target.value),
                          })
                        }
                        className={dialog.formErrors.amount ? "border-red-500" : ""}
                      />
                      {dialog.formErrors.amount && (
                        <p className="text-sm text-destructive">{dialog.formErrors.amount}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={dialog.formData.date}
                        onChange={(e) => dialog.updateFormData({ date: e.target.value })}
                        className={dialog.formErrors.date ? "border-red-500" : ""}
                      />
                      {dialog.formErrors.date && (
                        <p className="text-sm text-destructive">{dialog.formErrors.date}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={dialog.formData.description || ""}
                      onChange={(e) => dialog.updateFormData({ description: e.target.value })}
                      placeholder="Details about the expense..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={dialog.closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={dialog.isSubmitting}>
                      Create Expense
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </PageHeader>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {formatCurrency(metrics.totalIncome)}
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  From rent and deposits
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {formatCurrency(metrics.totalExpenses)}
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Maintenance, repairs, etc.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Net Income</CardTitle>
                <DollarSign
                  className={cn(
                    "h-4 w-4",
                    metrics.netProfit >= 0 ? "text-green-500" : "text-red-500",
                  )}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    metrics.netProfit >= 0 ? "text-green-500" : "text-red-500",
                  )}
                >
                  {formatCurrency(metrics.netProfit)}
                </div>
                <p className="text-xs text-zinc-500">Cash flow for period</p>
              </CardContent>
            </Card>
          </div>

          {/* Tax Calculation Section */}
          {timeRange === "year" && taxCalculation && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[var(--color-foreground)] flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Tax Calculation - {selectedCountry === "PT" ? "Portugal" : "Spain"}
                    </CardTitle>
                    <CardDescription>Estimated tax liability for rental income</CardDescription>
                  </div>
                  <Select
                    value={selectedCountry}
                    onValueChange={(value: "PT" | "ES") => setSelectedCountry(value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="ES">Spain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-400">Gross Income</Label>
                    <div className="text-lg font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(taxCalculation.grossIncome)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-400">Taxable Income</Label>
                    <div className="text-lg font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(taxCalculation.taxableIncome)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-400">Tax Amount</Label>
                    <div className="text-lg font-semibold text-red-400">
                      {formatCurrency(taxCalculation.taxAmount)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {taxCalculation.effectiveRate.toFixed(1)}% effective rate
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-400">Quarterly Payment</Label>
                    <div className="text-base font-semibold text-yellow-400">
                      {formatCurrency(taxCalculation.quarterlyPayment)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-400">Annual Settlement</Label>
                    <div className="text-base font-semibold text-orange-400">
                      {formatCurrency(taxCalculation.annualSettlement)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-sm font-medium text-zinc-400">Deductions Applied</Label>
                  <div className="mt-2 space-y-1">
                    {Object.entries(taxCalculation.deductions.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-zinc-400 capitalize">
                          {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </span>
                        <span className="text-zinc-50">{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-700 pt-1 mt-2 flex justify-between font-medium">
                      <span className="text-zinc-300">Total Deductions</span>
                      <span className="text-green-400">
                        {formatCurrency(taxCalculation.deductions.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-zinc-800 rounded-md">
                  <p className="text-xs text-zinc-400">
                    <strong>Note:</strong> This is an estimate based on{" "}
                    {selectedCountry === "PT" ? "Portugal" : "Spain"} tax regulations for 2024.
                    Consult a tax professional for accurate calculations and compliance with current
                    laws.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Income */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Recent Income</CardTitle>
                <CardDescription>Latest rent payments received</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.filteredReceipts.slice(0, 5).map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-900/20 rounded-full">
                          <DollarSign className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            {receipt.propertyName}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(receipt.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-green-500">
                        +{formatCurrency(receipt.amount)}
                      </div>
                    </div>
                  ))}
                  {metrics.filteredReceipts.length === 0 && (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No income records found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Latest tracked property costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.filteredExpenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-900/20 rounded-full">
                          <FileText className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{expense.category}</p>
                          <p className="text-xs text-zinc-500">
                            {expense.propertyName ? expense.propertyName : "Unknown Property"} •{" "}
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-red-500">
                        -{formatCurrency(expense.amount)}
                      </div>
                    </div>
                  ))}
                  {metrics.filteredExpenses.length === 0 && (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No expense records found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
