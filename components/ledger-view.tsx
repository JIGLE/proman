"use client";

import { useState, useMemo, useEffect } from "react";
import { ZodError } from "zod";
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  Plus,
  Calendar,
  FileText,
  Download,
  Trash2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "@/lib/app-context-db";
import { useToast } from "@/lib/toast-context";
import { receiptSchema, expenseSchema, ReceiptFormData, ExpenseFormData } from "@/lib/validation";
import { Receipt, Expense } from "@/lib/types";
import jsPDF from "jspdf";
import { formatCurrency, getCurrencyForCountry } from '@/lib/currency';
import { convertClient } from '@/lib/exchange-client';

export function LedgerView(): React.ReactElement {
  const { state, addReceipt, deleteReceipt, addExpense } = useApp();
  const { receipts, expenses, properties, tenants } = state;
  const { success, error } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<"all" | "income" | "expenses">("all");
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // Form State for Receipt
  const [receiptFormData, setReceiptFormData] = useState<ReceiptFormData>({
    tenantId: "",
    propertyId: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    type: "rent",
    status: "paid",
    description: "",
  });
  const [receiptErrors, setReceiptErrors] = useState<Partial<Record<keyof ReceiptFormData, string>>>({});

  // Form State for Expense
  const [expenseFormData, setExpenseFormData] = useState<ExpenseFormData>({
    propertyId: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    category: "Maintenance",
    description: "",
  });
  const [expenseErrors, setExpenseErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});

  // Memoized Metrics
  const metrics = useMemo(() => {
    const totalIncome = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netPosition = totalIncome - totalExpenses;
    const estimatedTax = receipts.reduce((sum, r) => sum + (r.estimatedTaxImpact || 0), 0);

    return { totalIncome, totalExpenses, netPosition, estimatedTax };
  }, [receipts, expenses]);

  // Combined Chronological Transactions
  const allTransactions = useMemo(() => {
    const rTx = receipts.map((r) => ({
      id: r.id,
      date: r.date,
      type: "income" as const,
      category: r.type,
      description: r.description || `Rent payment from ${r.tenantName}`,
      propertyName: r.propertyName || "Unknown Property",
      amount: r.amount,
      status: r.status,
      taxDetailAmount: r.estimatedTaxImpact || 0,
      raw: r,
    }));

    const eTx = expenses.map((e) => ({
      id: e.id,
      date: e.date,
      type: "expense" as const,
      category: e.category,
      description: e.description || e.category,
      propertyName: e.propertyName || "Unknown Property",
      amount: e.amount,
      status: "paid",
      taxDetail: e.deductibleStatus ? `${e.deductibleStatus.toUpperCase()} Deductible` : null,
      raw: e,
    }));

    return [...rTx, ...eTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, expenses]);

  // Submit Handlers
  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setReceiptErrors({});

    try {
      const validatedData = receiptSchema.parse(receiptFormData);
      await addReceipt(validatedData);
      success("Receipt created successfully (Tax Engine processed)!");
      setIsReceiptDialogOpen(false);
      resetReceiptForm();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const errors: Partial<Record<keyof ReceiptFormData, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ReceiptFormData;
          errors[field] = issue.message;
        });
        setReceiptErrors(errors);
        error("Please fix receipt validation errors.");
      } else {
        error("Failed to save receipt. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setExpenseErrors({});

    try {
      const validatedData = expenseSchema.parse(expenseFormData);
      await addExpense(validatedData);
      success("Expense recorded successfully (Tax Engine processed)!");
      setIsExpenseDialogOpen(false);
      resetExpenseForm();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const errors: Partial<Record<keyof ExpenseFormData, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ExpenseFormData;
          errors[field] = issue.message;
        });
        setExpenseErrors(errors);
        error("Please fix expense validation errors.");
      } else {
        error("Failed to save expense. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetReceiptForm = () => {
    setReceiptFormData({
      tenantId: "",
      propertyId: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      type: "rent",
      status: "paid",
      description: "",
    });
    setReceiptErrors({});
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      propertyId: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      category: "Maintenance",
      description: "",
    });
    setExpenseErrors({});
  };

  const handleDeleteReceipt = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction receipt?")) {
      try {
        await deleteReceipt(id);
        success("Receipt deleted successfully!");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const generatePDF = async (receipt: Receipt) => {
    setGeneratingPdf(receipt.id);
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Receipt #: ${receipt.id}`, 20, 40);
      doc.text(`Date: ${new Date(receipt.date).toLocaleDateString()}`, 20, 50);

      doc.setLineWidth(0.5);
      doc.line(20, 60, 190, 60);

      doc.setFontSize(14);
      doc.text("TENANT & LEASE INFORMATION", 20, 75);
      doc.setFontSize(11);
      doc.text(`Name: ${receipt.tenantName}`, 20, 85);
      doc.text(`Property: ${receipt.propertyName}`, 20, 95);

      doc.setFontSize(14);
      doc.text("PAYMENT DETAILS", 20, 115);
      doc.setFontSize(11);
      // Determine currency for the property
      const property = properties.find((p) => p.id === receipt.propertyId);
      const propertyCurrency = getCurrencyForCountry(property?.countryCode || undefined);
      doc.text(`Amount: ${formatCurrency(receipt.amount, propertyCurrency)}`, 20, 125);
      doc.text(`Type: ${receipt.type.charAt(0).toUpperCase() + receipt.type.slice(1)}`, 20, 135);
      if (receipt.description) {
        doc.text(`Description: ${receipt.description}`, 20, 145);
      }

      doc.setFontSize(14);
      doc.text("TAX COMPLIANCE (PROMAN OS ENGINE)", 20, 165);
      doc.setFontSize(11);
      doc.text(`Taxable Amount: ${formatCurrency((receipt.taxableAmount || 0), propertyCurrency)}`, 20, 175);
      doc.text(`Estimated Tax Impact: ${formatCurrency((receipt.estimatedTaxImpact || 0), propertyCurrency)}`, 20, 185);
      doc.text(`Tax Period: ${receipt.taxPeriod || "N/A"}`, 20, 195);

      doc.setFontSize(10);
      doc.text("Thank you for your payment!", 105, 220, { align: "center" });
      doc.text("Proman Property Management OS", 105, 230, { align: "center" });

      doc.save(`receipt-${receipt.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Preferred currency (user setting)
  const [preferredCurrency, setPreferredCurrency] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.preferredCurrency) setPreferredCurrency(json.preferredCurrency);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  // Small inline component to show approximate converted value
  function ConvertedApproxInline({ amount, from, to }: { amount: number; from: string; to: string }) {
    const [val, setVal] = useState<number | null>(null);
    useEffect(() => {
      let mounted = true;
      if (!to || from === to) {
        setVal(amount);
        return;
      }
      (async () => {
        try {
          const converted = await convertClient(amount, from, to);
          if (mounted) setVal(converted);
        } catch (err) {
          // ignore
        }
      })();
      return () => { mounted = false; };
    }, [amount, from, to]);

    if (val === null) return <span>…</span>;
    return <>{formatCurrency(val, to)}</>;
  }

  const getDeductibleBadgeColor = (status: string) => {
    switch (status) {
      case "fully":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "partially":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      default:
        return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
    }
  };

  const expenseCategories = [
    "Maintenance",
    "Repairs",
    "Utilities",
    "Insurance",
    "Taxes",
    "Mortgage Interest",
    "Management Fees",
    "Marketing",
    "Legal/Professional",
    "Capital Improvements",
    "Other",
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Ledger</h2>
          <p className="text-zinc-400">System of record mapping cashflow, receipts, and silent tax intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Add Receipt */}
          <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetReceiptForm} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-xl">
              <DialogHeader>
                <DialogTitle>Record Payment Receipt</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Creates payment transaction. Tax strategy automatically calculates income liability.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleReceiptSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tenant</Label>
                    <Select value={receiptFormData.tenantId} onValueChange={(val) => setReceiptFormData({ ...receiptFormData, tenantId: val })}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {receiptErrors.tenantId && <p className="text-xs text-rose-500">{receiptErrors.tenantId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Select value={receiptFormData.propertyId} onValueChange={(val) => setReceiptFormData({ ...receiptFormData, propertyId: val })}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.countryCode})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {receiptErrors.propertyId && <p className="text-xs text-rose-500">{receiptErrors.propertyId}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ({getCurrencyForCountry(properties.find((p) => p.id === receiptFormData.propertyId)?.countryCode)})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={receiptFormData.amount || ""}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, amount: parseFloat(e.target.value) || 0 })}
                      className="border-zinc-800 bg-zinc-950"
                    />
                    {receiptErrors.amount && <p className="text-xs text-rose-500">{receiptErrors.amount}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={receiptFormData.date}
                      onChange={(e) => setReceiptFormData({ ...receiptFormData, date: e.target.value })}
                      className="border-zinc-800 bg-zinc-950 text-zinc-50"
                    />
                    {receiptErrors.date && <p className="text-xs text-rose-500">{receiptErrors.date}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={receiptFormData.type} onValueChange={(val: any) => setReceiptFormData({ ...receiptFormData, type: val })}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {receiptErrors.type && <p className="text-xs text-rose-500">{receiptErrors.type}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Reference, notes, lease term notes..."
                    value={receiptFormData.description || ""}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, description: e.target.value })}
                    className="border-zinc-800 bg-zinc-950"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSubmitting ? "Processing..." : "Create Receipt"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Expense */}
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetExpenseForm} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-xl">
              <DialogHeader>
                <DialogTitle>Record Expense Outlay</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Logs maintenance or tax expense. Tax engine automatically handles deductibility classing.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleExpenseSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Select value={expenseFormData.propertyId} onValueChange={(val) => setExpenseFormData({ ...expenseFormData, propertyId: val })}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.countryCode})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {expenseErrors.propertyId && <p className="text-xs text-rose-500">{expenseErrors.propertyId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expenseFormData.category} onValueChange={(val) => setExpenseFormData({ ...expenseFormData, category: val })}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-50">
                        {expenseCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {expenseErrors.category && <p className="text-xs text-rose-500">{expenseErrors.category}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ({getCurrencyForCountry(properties.find((p) => p.id === expenseFormData.propertyId)?.countryCode)})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseFormData.amount || ""}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: parseFloat(e.target.value) || 0 })}
                      className="border-zinc-800 bg-zinc-950"
                    />
                    {expenseErrors.amount && <p className="text-xs text-rose-500">{expenseErrors.amount}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={expenseFormData.date}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                      className="border-zinc-800 bg-zinc-950 text-zinc-50"
                    />
                    {expenseErrors.date && <p className="text-xs text-rose-500">{expenseErrors.date}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Invoice ID, work completed, notes..."
                    value={expenseFormData.description || ""}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    className="border-zinc-800 bg-zinc-950"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-zinc-800 hover:bg-zinc-700 text-white">
                    {isSubmitting ? "Processing..." : "Save Expense"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Income Card */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.totalIncome, 'EUR')}</div>
              {preferredCurrency && preferredCurrency !== 'EUR' && (
                <p className="text-[10px] text-zinc-500 mt-1">≈ {preferredCurrency} <ConvertedApproxInline amount={metrics.totalIncome} from="EUR" to={preferredCurrency} /></p>
              )}
              {!preferredCurrency && <p className="text-[10px] text-zinc-500 mt-1">Recognized rental receipts</p>}
            </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">{formatCurrency(metrics.totalExpenses, 'EUR')}</div>
            {preferredCurrency && preferredCurrency !== 'EUR' && (
              <p className="text-[10px] text-zinc-500 mt-1">≈ {preferredCurrency} <ConvertedApproxInline amount={metrics.totalExpenses} from="EUR" to={preferredCurrency} /></p>
            )}
            {!preferredCurrency && <p className="text-[10px] text-zinc-500 mt-1">Maintenance & legal outlays</p>}
          </CardContent>
        </Card>

        {/* Net Position Card */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Net Position</CardTitle>
            <Scale className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netPosition >= 0 ? "text-blue-400" : "text-rose-400"}`}>
              {formatCurrency(metrics.netPosition, 'EUR')}
            </div>
            {preferredCurrency && preferredCurrency !== 'EUR' ? (
              <p className="text-[10px] text-zinc-500 mt-1">≈ {preferredCurrency} <ConvertedApproxInline amount={metrics.netPosition} from="EUR" to={preferredCurrency} /></p>
            ) : (
              <p className="text-[10px] text-zinc-500 mt-1">Pre-tax operating balance</p>
            )}
          </CardContent>
        </Card>

        {/* Est Tax Impact Card */}
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tax Liability (Est)</CardTitle>
            <Percent className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{formatCurrency(metrics.estimatedTax, 'EUR')}</div>
            {preferredCurrency && preferredCurrency !== 'EUR' ? (
              <p className="text-[10px] text-zinc-500 mt-1">≈ {preferredCurrency} <ConvertedApproxInline amount={metrics.estimatedTax} from="EUR" to={preferredCurrency} /></p>
            ) : (
              <p className="text-[10px] text-zinc-500 mt-1">Calculated via Country Engines</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tab Switcher */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveSubTab("all")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeSubTab === "all" ? "border-emerald-500 text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setActiveSubTab("income")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeSubTab === "income" ? "border-emerald-500 text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Income (Receipts)
          </button>
          <button
            onClick={() => setActiveSubTab("expenses")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeSubTab === "expenses" ? "border-emerald-500 text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Content Lists */}
      <div className="space-y-4">
        {activeSubTab === "all" && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Reference / Description</th>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3">Flow</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Tax Intelligence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {allTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-600">
                      No transactions recorded in the ledger yet.
                    </td>
                  </tr>
                ) : (
                  allTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-800/20">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-medium">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-zinc-200 font-semibold">{tx.description}</span>
                          <span className="text-xs text-zinc-500 font-medium lowercase tracking-wide mt-0.5">
                            ref: #{tx.id.split("-")[1] || tx.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{tx.propertyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={tx.type === "income" ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20" : "bg-rose-600/20 text-rose-400 border border-rose-500/20"}>
                          {tx.type === "income" ? "INFLOW" : "OUTFLOW"}
                        </Badge>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                        {(() => {
                          const prop = properties.find((p) => p.id === tx.raw.propertyId) || properties.find((p) => p.name === tx.propertyName);
                          const cur = getCurrencyForCountry(prop?.countryCode || undefined);
                          return (
                            <div>
                              <div>{tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, cur)}</div>
                              {preferredCurrency && preferredCurrency !== cur && (
                                <div className="text-[10px] text-zinc-500 mt-1">≈ <ConvertedApproxInline amount={tx.amount} from={cur} to={preferredCurrency} /></div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {("taxDetail" in tx && (tx as any).taxDetail) ? (
                          <Badge className="bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-[10px] font-semibold tracking-wider">
                            {(tx as any).taxDetail}
                          </Badge>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "income" && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Tenant</th>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Receipt Amount</th>
                  <th className="px-6 py-3 text-right">Taxable</th>
                  <th className="px-6 py-3 text-right">Est. Tax Impact</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-zinc-600">
                      No income receipts recorded yet.
                    </td>
                  </tr>
                ) : (
                  receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-800/20">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-medium">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-200">{r.tenantName}</td>
                      <td className="px-6 py-4 text-zinc-300">{r.propertyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={r.status === "paid" ? "bg-emerald-600/20 text-emerald-400" : "bg-amber-600/20 text-amber-400"}>
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400">
                        {(() => {
                          const prop = properties.find((p) => p.id === r.propertyId) || properties.find((p) => p.name === r.propertyName);
                          const cur = getCurrencyForCountry(prop?.countryCode || undefined);
                          return (
                            <div>
                              <div>{formatCurrency(r.amount, cur)}</div>
                              {preferredCurrency && preferredCurrency !== cur && (
                                <div className="text-[10px] text-zinc-500 mt-1">≈ <ConvertedApproxInline amount={r.amount} from={cur} to={preferredCurrency} /></div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300">
                        {(() => {
                          const prop = properties.find((p) => p.id === r.propertyId) || properties.find((p) => p.name === r.propertyName);
                          const cur = getCurrencyForCountry(prop?.countryCode || undefined);
                          const amt = (r.taxableAmount || r.amount);
                          return (
                            <div>
                              <div>{formatCurrency(amt, cur)}</div>
                              {preferredCurrency && preferredCurrency !== cur && (
                                <div className="text-[10px] text-zinc-500 mt-1">≈ <ConvertedApproxInline amount={amt} from={cur} to={preferredCurrency} /></div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-amber-400">
                        {(() => {
                          const prop = properties.find((p) => p.id === r.propertyId) || properties.find((p) => p.name === r.propertyName);
                          const cur = getCurrencyForCountry(prop?.countryCode || undefined);
                          const amt = (r.estimatedTaxImpact || 0);
                          return (
                            <div>
                              <div>{formatCurrency(amt, cur)}</div>
                              {preferredCurrency && preferredCurrency !== cur && (
                                <div className="text-[10px] text-zinc-500 mt-1">≈ <ConvertedApproxInline amount={amt} from={cur} to={preferredCurrency} /></div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generatePDF(r)}
                            disabled={generatingPdf === r.id}
                            className="h-7 px-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReceipt(r.id)}
                            className="h-7 px-2 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "expenses" && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3 text-right">Outlay Amount</th>
                  <th className="px-6 py-3 text-right">Deductible Class</th>
                  <th className="px-6 py-3 text-right">Deductible Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-600">
                      No expense outlays recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-800/20">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-medium">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-200">{e.category}</td>
                      <td className="px-6 py-4 text-zinc-300 max-w-xs truncate">{e.description || e.category}</td>
                      <td className="px-6 py-4 text-zinc-400">{e.propertyName || "Unknown"}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-400">
                        {(() => {
                          const prop = properties.find((p) => p.id === e.propertyId) || properties.find((p) => p.name === e.propertyName);
                          const cur = getCurrencyForCountry(prop?.countryCode || undefined);
                          return (
                            <div>
                              <div>{formatCurrency(e.amount, cur)}</div>
                              {preferredCurrency && preferredCurrency !== cur && (
                                <div className="text-[10px] text-zinc-500 mt-1">≈ <ConvertedApproxInline amount={e.amount} from={cur} to={preferredCurrency} /></div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Badge className={getDeductibleBadgeColor(e.deductibleStatus || "fully")}>
                          {(e.deductibleStatus || "fully").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                        {(() => {
                          const val = (e.deductibleAmount !== undefined ? e.deductibleAmount : e.amount);
                          const prop = properties.find((p) => p.id === e.propertyId) || properties.find((p) => p.name === e.propertyName);
                          const cur = getCurrencyForCountry(prop?.countryCode || undefined);
                          return (
                            <div>
                              <div>{formatCurrency(val, cur)}</div>
                              {preferredCurrency && preferredCurrency !== cur && (
                                <div className="text-[10px] text-zinc-500 mt-1">≈ <ConvertedApproxInline amount={val} from={cur} to={preferredCurrency} /></div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
