"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  FileText, 
  Plus, 
  Calendar as CalendarIcon, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Download,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/lib/contexts/toast-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { cn } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Invoice, InvoiceLineItem, LateFeeConfig } from "@/lib/services/invoice-service";

interface InvoicesViewProps {
  tenants: Array<{ id: string; name: string; rent: number }>;
  properties: Array<{ id: string; name: string }>;
}

export function InvoicesView({ tenants, properties }: InvoicesViewProps): React.ReactElement {
  const { success, error } = useToast();
  const { formatCurrency } = useCurrency();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isLateFeeDialogOpen, setIsLateFeeDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Form state
  const [formData, setFormData] = useState({
    tenantId: "",
    propertyId: "",
    amount: 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "",
    notes: "",
  });
  
  // Batch form state
  const [batchDueDate, setBatchDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [batchMonth, setBatchMonth] = useState(
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
  
  // Late fee config state
  const [lateFeeConfig, setLateFeeConfig] = useState<LateFeeConfig>({
    enabled: true,
    gracePeriodDays: 5,
    percentageRate: 5,
    flatFee: 0,
    maxPercentage: 25,
  });

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Summary calculations
  const summary = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'pending');
    const paid = invoices.filter(i => i.status === 'paid');
    const overdue = invoices.filter(i => i.status === 'overdue');
    
    return {
      totalPending: pending.reduce((sum, i) => sum + i.amount, 0),
      totalPaid: paid.reduce((sum, i) => sum + i.amount, 0),
      totalOverdue: overdue.reduce((sum, i) => sum + i.amount, 0),
      countPending: pending.length,
      countPaid: paid.length,
      countOverdue: overdue.length,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter(i => i.status === statusFilter);
  }, [invoices, statusFilter]);

  // Auto-fill amount when tenant selected
  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    setFormData(prev => ({
      ...prev,
      tenantId,
      amount: tenant?.rent || prev.amount,
    }));
  };

  // Create invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lineItems: formData.amount > 0 ? [{
            description: formData.description || 'Monthly Rent',
            quantity: 1,
            unitPrice: formData.amount,
            total: formData.amount,
          }] : undefined,
        }),
      });
      
      if (response.ok) {
        success('Invoice created successfully!');
        setIsDialogOpen(false);
        resetForm();
        fetchInvoices();
      } else {
        const data = await response.json();
        error(data.message || 'Failed to create invoice');
      }
    } catch (err) {
      error('Failed to create invoice');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate batch invoices
  const handleBatchGenerate = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/invoices/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: batchDueDate,
          month: batchMonth,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        success(`Generated ${data.successCount} invoices!`);
        setIsBatchDialogOpen(false);
        fetchInvoices();
      } else {
        error(data.message || 'Failed to generate batch invoices');
      }
    } catch (err) {
      error('Failed to generate batch invoices');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply late fees
  const handleApplyLateFees = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/invoices/late-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lateFeeConfig),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.count > 0) {
          success(`Applied late fees to ${data.count} invoices`);
        } else {
          success('No invoices required late fee application');
        }
        setIsLateFeeDialogOpen(false);
        fetchInvoices();
      } else {
        error(data.message || 'Failed to apply late fees');
      }
    } catch (err) {
      error('Failed to apply late fees');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark as paid
  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        success('Invoice marked as paid');
        fetchInvoices();
      } else {
        error('Failed to mark invoice as paid');
      }
    } catch (err) {
      error('Failed to mark invoice as paid');
      console.error(err);
    }
  };

  // Delete invoice
  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        success('Invoice deleted');
        fetchInvoices();
      } else {
        error('Failed to delete invoice');
      }
    } catch (err) {
      error('Failed to delete invoice');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      tenantId: "",
      propertyId: "",
      amount: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Overdue</Badge>;
      case 'cancelled':
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Invoices</h2>
          <p className="text-zinc-400">Manage billing and track payments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => setIsLateFeeDialogOpen(true)}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Apply Late Fees
          </Button>
          
          <Button variant="outline" onClick={() => setIsBatchDialogOpen(true)}>
            <Send className="w-4 h-4 mr-2" />
            Batch Generate
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>
                  Generate a new invoice for a tenant
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantId">Tenant</Label>
                    <Select 
                      value={formData.tenantId} 
                      onValueChange={handleTenantChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="propertyId">Property</Label>
                    <Select 
                      value={formData.propertyId} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(property => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          amount: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          dueDate: e.target.value 
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        description: e.target.value 
                      }))}
                      placeholder="e.g., Monthly Rent - February 2026"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{formatCurrency(summary.totalPending)}</div>
            <p className="text-xs text-zinc-500">{summary.countPending} invoices</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">{formatCurrency(summary.totalPaid)}</div>
            <p className="text-xs text-zinc-500">{summary.countPaid} invoices</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalOverdue)}</div>
            <p className="text-xs text-zinc-500">{summary.countOverdue} invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-50">Invoice List</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchInvoices}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-zinc-400">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map(invoice => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-50">{invoice.number}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {invoice.tenantName || invoice.propertyName || 'No details'}
                        {invoice.description && ` • ${invoice.description}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-zinc-50">
                        {formatCurrency(invoice.amount)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {invoice.status === 'pending' || invoice.status === 'overdue' ? (
                          <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Generate Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Batch Generate Invoices</DialogTitle>
            <DialogDescription>
              Generate rent invoices for all active tenants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchDueDate">Due Date</Label>
              <Input
                id="batchDueDate"
                type="date"
                value={batchDueDate}
                onChange={(e) => setBatchDueDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="batchMonth">Month Label</Label>
              <Input
                id="batchMonth"
                value={batchMonth}
                onChange={(e) => setBatchMonth(e.target.value)}
                placeholder="e.g., February 2026"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsBatchDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleBatchGenerate} disabled={isSubmitting}>
                {isSubmitting ? 'Generating...' : 'Generate Invoices'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Late Fee Config Dialog */}
      <Dialog open={isLateFeeDialogOpen} onOpenChange={setIsLateFeeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Apply Late Fees</DialogTitle>
            <DialogDescription>
              Configure and apply late fees to overdue invoices
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gracePeriod">Grace Period (days)</Label>
              <Input
                id="gracePeriod"
                type="number"
                value={lateFeeConfig.gracePeriodDays}
                onChange={(e) => setLateFeeConfig(prev => ({ 
                  ...prev, 
                  gracePeriodDays: parseInt(e.target.value) || 0 
                }))}
              />
              <p className="text-xs text-zinc-500">
                Days after due date before late fee applies
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="percentageRate">Late Fee %</Label>
                <Input
                  id="percentageRate"
                  type="number"
                  step="0.5"
                  value={lateFeeConfig.percentageRate}
                  onChange={(e) => setLateFeeConfig(prev => ({ 
                    ...prev, 
                    percentageRate: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxPercentage">Max Fee %</Label>
                <Input
                  id="maxPercentage"
                  type="number"
                  step="1"
                  value={lateFeeConfig.maxPercentage || ''}
                  onChange={(e) => setLateFeeConfig(prev => ({ 
                    ...prev, 
                    maxPercentage: parseFloat(e.target.value) || undefined 
                  }))}
                />
              </div>
            </div>
            
            <div className="rounded-lg bg-zinc-800/50 p-3 text-sm">
              <p className="text-zinc-400">
                This will apply a <span className="text-zinc-50">{lateFeeConfig.percentageRate}%</span> late fee 
                to all pending invoices that are more than <span className="text-zinc-50">{lateFeeConfig.gracePeriodDays} days</span> overdue.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsLateFeeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleApplyLateFees} disabled={isSubmitting}>
                {isSubmitting ? 'Applying...' : 'Apply Late Fees'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
