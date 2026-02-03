"use client";

import React, { useState, useEffect } from "react";
import { 
  Download, 
  Building2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/contexts/toast-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { cn } from "@/lib/utils/utils";
import type { FinancialReport } from "@/lib/services/financial-reports";

// Type definitions for tax and rent roll reports
interface TaxReportData {
  year: number;
  grossIncome: number;
  totalExpenses: number;
  netIncome: number;
  deductibleExpenses: Array<{ category: string; amount: number; percentage: number }>;
  quarterlyBreakdown: Array<{
    quarter: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  properties: Array<{
    propertyId: string;
    propertyName: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

interface RentRollData {
  totalMonthlyRent: number;
  totalAnnualRent: number;
  occupancyRate: number;
  properties: Array<{
    propertyId: string;
    propertyName: string;
    status: string;
    monthlyRent: number;
    tenantName?: string;
    leaseEnd?: string;
  }>;
}

export function ReportsView(): React.ReactElement {
  const { success, error } = useToast();
  const { formatCurrency } = useCurrency();
  
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState<'financial' | 'tax' | 'rent-roll'>('financial');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [taxReport, setTaxReport] = useState<TaxReportData | null>(null);
  const [rentRoll, setRentRoll] = useState<RentRollData | null>(null);
  
  // Date range state
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastOfMonth.toISOString().split('T')[0]);
  const [taxYear, setTaxYear] = useState(now.getFullYear());

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setIsLoading(true);
    
    try {
      let url = '/api/reports?';
      
      switch (reportType) {
        case 'financial':
          url += `type=financial&startDate=${startDate}&endDate=${endDate}`;
          break;
        case 'tax':
          url += `type=tax&year=${taxYear}`;
          break;
        case 'rent-roll':
          url += 'type=rent-roll';
          break;
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        switch (reportType) {
          case 'financial':
            setReport(data.data);
            break;
          case 'tax':
            setTaxReport(data.data);
            break;
          case 'rent-roll':
            setRentRoll(data.data);
            break;
        }
      } else {
        error('Failed to load report');
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
      error('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, startDate, endDate, taxYear, error]);

  // Download CSV
  const downloadCSV = async () => {
    try {
      const url = `/api/reports?type=financial&startDate=${startDate}&endDate=${endDate}&format=csv`;
      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `financial-report-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        success('Report downloaded');
      } else {
        error('Failed to download report');
      }
    } catch (err) {
      console.error('Failed to download:', err);
      error('Failed to download report');
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGenerateReport = () => {
    fetchReport();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Financial Reports</h2>
          <p className="text-zinc-400">Generate and export financial summaries</p>
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="tax">Tax Report</TabsTrigger>
          <TabsTrigger value="rent-roll">Rent Roll</TabsTrigger>
        </TabsList>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-6">
          {/* Controls */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <Button onClick={handleGenerateReport} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Generate
                </Button>
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {report && (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Total Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(report.income.total)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-400">
                      {formatCurrency(report.expenses.total)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Net Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl font-bold",
                      report.netIncome >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(report.netIncome)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Profit Margin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl font-bold",
                      report.profitMargin >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {report.profitMargin.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Income Breakdown */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-zinc-50">Income Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Rent</span>
                        <span className="font-medium text-zinc-50">{formatCurrency(report.income.totalRent)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Deposits</span>
                        <span className="font-medium text-zinc-50">{formatCurrency(report.income.totalDeposits)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Other</span>
                        <span className="font-medium text-zinc-50">{formatCurrency(report.income.totalOther)}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-3 flex justify-between items-center">
                        <span className="font-medium text-zinc-300">Total</span>
                        <span className="font-bold text-green-400">{formatCurrency(report.income.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-zinc-50">Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.expenses.byCategory.map(cat => (
                        <div key={cat.category} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">{cat.category}</span>
                            <span className="text-xs text-zinc-500">({cat.percentage}%)</span>
                          </div>
                          <span className="font-medium text-zinc-50">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                      {report.expenses.byCategory.length === 0 && (
                        <p className="text-zinc-500 text-sm">No expenses recorded</p>
                      )}
                      <div className="border-t border-zinc-700 pt-3 flex justify-between items-center">
                        <span className="font-medium text-zinc-300">Total</span>
                        <span className="font-bold text-red-400">{formatCurrency(report.expenses.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Income by Property */}
              {report.income.byProperty.length > 0 && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-zinc-50">Income by Property</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.income.byProperty.map(prop => (
                        <div key={prop.propertyId} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-zinc-500" />
                            <span className="text-zinc-50">{prop.propertyName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-zinc-50">{formatCurrency(prop.total)}</div>
                            <div className="text-xs text-zinc-500">
                              Rent: {formatCurrency(prop.rent)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoice Summary */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-50">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                      <div className="text-2xl font-bold text-yellow-400">
                        {report.invoices.summary.invoiceCount.pending}
                      </div>
                      <div className="text-sm text-zinc-400">Pending</div>
                      <div className="text-sm text-zinc-500">
                        {formatCurrency(report.invoices.summary.totalPending)}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/10">
                      <div className="text-2xl font-bold text-green-400">
                        {report.invoices.summary.invoiceCount.paid}
                      </div>
                      <div className="text-sm text-zinc-400">Paid</div>
                      <div className="text-sm text-zinc-500">
                        {formatCurrency(report.invoices.summary.totalPaid)}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-red-500/10">
                      <div className="text-2xl font-bold text-red-400">
                        {report.invoices.summary.invoiceCount.overdue}
                      </div>
                      <div className="text-sm text-zinc-400">Overdue</div>
                      <div className="text-sm text-zinc-500">
                        {formatCurrency(report.invoices.summary.totalOverdue)}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-orange-500/10">
                      <div className="text-2xl font-bold text-orange-400">
                        {formatCurrency(report.invoices.summary.totalLateFees)}
                      </div>
                      <div className="text-sm text-zinc-400">Late Fees</div>
                      <div className="text-sm text-zinc-500">Collected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tax Report */}
        <TabsContent value="tax" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Tax Year</Label>
                  <Select value={taxYear.toString()} onValueChange={(v) => setTaxYear(parseInt(v))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGenerateReport} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {taxReport && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-50">Tax Year {taxReport.year}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="text-center p-4 rounded-lg bg-zinc-800/50">
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(taxReport.grossIncome)}
                    </div>
                    <div className="text-sm text-zinc-400">Gross Income</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-zinc-800/50">
                    <div className="text-2xl font-bold text-red-400">
                      {formatCurrency(taxReport.totalExpenses)}
                    </div>
                    <div className="text-sm text-zinc-400">Deductible Expenses</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-zinc-800/50">
                    <div className="text-2xl font-bold text-zinc-50">
                      {formatCurrency(taxReport.netIncome)}
                    </div>
                    <div className="text-sm text-zinc-400">Taxable Income</div>
                  </div>
                </div>

                <h4 className="font-medium text-zinc-300 mb-3">Quarterly Breakdown</h4>
                <div className="grid gap-3 md:grid-cols-4">
                  {(taxReport.quarterlyBreakdown || []).map((q) => (
                    <div key={q.quarter} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                      <div className="font-medium text-zinc-50 mb-2">{q.quarter}</div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Income</span>
                          <span className="text-green-400">{formatCurrency(q.income)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Expenses</span>
                          <span className="text-red-400">{formatCurrency(q.expenses)}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-700 pt-1">
                          <span className="text-zinc-400">Net</span>
                          <span className="text-zinc-50">{formatCurrency(q.net)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rent Roll */}
        <TabsContent value="rent-roll" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <Button onClick={handleGenerateReport} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh Rent Roll
              </Button>
            </CardContent>
          </Card>

          {rentRoll && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Monthly Rent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-zinc-50">
                      {formatCurrency(rentRoll.totalMonthlyRent)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Annual Rent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-zinc-50">
                      {formatCurrency(rentRoll.totalAnnualRent)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Occupancy Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-zinc-50">
                      {rentRoll.occupancyRate}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-50">Property Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(rentRoll.properties || []).map((prop) => (
                      <div 
                        key={prop.propertyId}
                        className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-zinc-500" />
                          <div>
                            <div className="font-medium text-zinc-50">{prop.propertyName}</div>
                            {prop.tenantName && (
                              <div className="text-sm text-zinc-400">Tenant: {prop.tenantName}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-zinc-50">{formatCurrency(prop.monthlyRent)}/mo</div>
                          <div className={cn(
                            "text-xs",
                            prop.status === 'occupied' ? 'text-green-400' : 
                            prop.status === 'vacant' ? 'text-yellow-400' : 'text-red-400'
                          )}>
                            {prop.status.charAt(0).toUpperCase() + prop.status.slice(1)}
                          </div>
                          {prop.leaseEnd && (
                            <div className="text-xs text-zinc-500">
                              Lease ends: {new Date(prop.leaseEnd).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
