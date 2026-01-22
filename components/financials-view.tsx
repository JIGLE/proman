"use client";

import { useState, useMemo } from "react";
import { ZodError } from "zod";
import { DollarSign, TrendingUp, TrendingDown, Plus, Calendar as CalendarIcon, FileText, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { useCurrency } from "@/lib/currency-context";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "@/lib/app-context-db";
import { expenseSchema, ExpenseFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import { TaxCalculator, TaxCalculationResult } from "@/lib/tax-calculator";

export function FinancialsView(): React.ReactElement {
  const { state, addExpense } = useApp();
  const { properties, receipts, expenses } = state;
  const { success, error } = useToast();
  const { formatCurrency } = useCurrency();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRange, setTimeRange] = useState("all"); // all, month, year
  const [selectedCountry, setSelectedCountry] = useState<'Portugal' | 'Spain'>('Portugal');

  const [formData, setFormData] = useState<ExpenseFormData>({
    propertyId: "",
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});

  // Calculations
  const metrics = useMemo(() => {
    let filteredReceipts = receipts;
    let filteredExpenses = expenses;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (timeRange === "month") {
      filteredReceipts = receipts.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      filteredExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (timeRange === "year") {
      filteredReceipts = receipts.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === currentYear;
      });
      filteredExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear;
      });
    }

    const totalIncome = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netIncome, filteredReceipts, filteredExpenses };
  }, [receipts, expenses, timeRange]);

  // Tax Calculations
  const taxCalculation = useMemo((): TaxCalculationResult | null => {
    if (timeRange !== "year") return null;

    const annualIncome = metrics.totalIncome;
    const annualExpenses = metrics.totalExpenses;

    try {
      return TaxCalculator.calculateTax({
        country: selectedCountry,
        regime: selectedCountry === 'Portugal' ? 'portugal_rendimentos' : 'spain_inmuebles',
        annualRentalIncome: annualIncome,
        deductibleExpenses: annualExpenses,
      });
    } catch (error) {
      console.error('Tax calculation error:', error);
      return null;
    }
  }, [metrics, selectedCountry, timeRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      const validatedData = expenseSchema.parse(formData);
      await addExpense(validatedData);
      success('Expense recorded successfully!');
      setIsDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const errors: Partial<Record<keyof ExpenseFormData, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ExpenseFormData;
          errors[field] = issue.message;
        });
        setFormErrors(errors);
        error('Please fix the form errors below.');
      } else {
        error('Failed to save expense.');
        console.error(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
    });
    setFormErrors({});
  };

  const categories = [
    "Maintenance",
    "Repairs",
    "Utilities",
    "Insurance",
    "Taxes",
    "Mortgage",
    "Management Fees",
    "Other"
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Financials</h2>
          <p className="text-zinc-400">Track income, expenses, and cash flow</p>
        </div>
        <div className="flex gap-2">
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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
                <DialogDescription>Add a new property expense to track your spending</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="property">Property</Label>
                    <Select
                      value={formData.propertyId}
                      onValueChange={(val) => setFormData({ ...formData, propertyId: val })}
                    >
                      <SelectTrigger id="property" className={formErrors.propertyId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.propertyId && <p className="text-xs text-red-500">{formErrors.propertyId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger id="category" className={formErrors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.category && <p className="text-xs text-red-500">{formErrors.category}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      className={formErrors.amount ? 'border-red-500' : ''}
                    />
                    {formErrors.amount && <p className="text-xs text-red-500">{formErrors.amount}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={formErrors.date ? 'border-red-500' : ''}
                    />
                    {formErrors.date && <p className="text-xs text-red-500">{formErrors.date}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Details about the expense..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Expense'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{formatCurrency(metrics.totalIncome)}</div>
            <p className="text-xs text-zinc-500">From rent and deposits</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{formatCurrency(metrics.totalExpenses)}</div>
            <p className="text-xs text-zinc-500">Maintenance, repairs, etc.</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Net Income</CardTitle>
            <DollarSign className={cn("h-4 w-4", metrics.netIncome >= 0 ? "text-green-500" : "text-red-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", metrics.netIncome >= 0 ? "text-green-500" : "text-red-500")}>
{formatCurrency(metrics.netIncome)}
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
                <CardTitle className="text-zinc-50 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Tax Calculation - {selectedCountry}
                </CardTitle>
                <CardDescription>
                  Estimated tax liability for rental income
                </CardDescription>
              </div>
              <Select value={selectedCountry} onValueChange={(value: 'Portugal' | 'Spain') => setSelectedCountry(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portugal">Portugal</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-400">Gross Income</Label>
                <div className="text-lg font-semibold text-zinc-50">
                  {formatCurrency(taxCalculation.grossIncome)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-400">Taxable Income</Label>
                <div className="text-lg font-semibold text-zinc-50">
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
                    <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="text-zinc-50">{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-700 pt-1 mt-2 flex justify-between font-medium">
                  <span className="text-zinc-300">Total Deductions</span>
                  <span className="text-green-400">{formatCurrency(taxCalculation.deductions.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-zinc-800 rounded-md">
              <p className="text-xs text-zinc-400">
                <strong>Note:</strong> This is an estimate based on {selectedCountry} tax regulations for 2024.
                Consult a tax professional for accurate calculations and compliance with current laws.
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
              {metrics.filteredReceipts.slice(0, 5).map(receipt => (
                <div key={receipt.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-900/20 rounded-full">
                      <DollarSign className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{receipt.propertyName}</p>
                      <p className="text-xs text-zinc-500">{new Date(receipt.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-500">
                    +{formatCurrency(receipt.amount)}
                  </div>
                </div>
              ))}
              {metrics.filteredReceipts.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No income records found</p>
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
              {metrics.filteredExpenses.slice(0, 5).map(expense => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-900/20 rounded-full">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{expense.category}</p>
                      <p className="text-xs text-zinc-500">
                        {expense.propertyName ? expense.propertyName : 'Unknown Property'} • {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-500">
                    -{formatCurrency(expense.amount)}
                  </div>
                </div>
              ))}
              {metrics.filteredExpenses.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No expense records found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
