import { useState, useMemo } from "react";
import { useApp } from "@/lib/app-context-db";
import { useCurrency } from "@/lib/currency-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, DollarSign, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight, Filter, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type PaymentMatrixViewProps = Record<string, never>

interface PaymentCell {
  status: 'paid' | 'pending' | 'overdue' | 'none';
  date?: string;
  amount?: number;
  receiptId?: string;
}

export function PaymentMatrixView(): React.ReactElement {
  const { state } = useApp();
  const { tenants, receipts, properties } = state;
  const { formatCurrency } = useCurrency();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'detailed' | 'heatmap'>('detailed');
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  // Generate months array
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Get unique years from receipts
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    receipts.forEach(receipt => {
      const year = new Date(receipt.date).getFullYear();
      years.add(year);
    });
    // Add current year if no receipts
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [receipts]);

  // Build payment matrix data
  const paymentMatrix = useMemo(() => {
    const matrix: Record<string, PaymentCell[]> = {};

    tenants.forEach(tenant => {
      matrix[tenant.id] = new Array(12).fill(null).map(() => ({
        status: 'none' as const
      }));

      // Find receipts for this tenant in the selected year
      const tenantReceipts = receipts.filter(receipt =>
        receipt.tenantId === tenant.id &&
        receipt.type === 'rent' &&
        new Date(receipt.date).getFullYear() === selectedYear
      );

      tenantReceipts.forEach(receipt => {
        const month = new Date(receipt.date).getMonth();
        const status: PaymentCell['status'] = receipt.status === 'paid' ? 'paid' : 'pending';

        matrix[tenant.id][month] = {
          status,
          date: receipt.date,
          amount: receipt.amount,
          receiptId: receipt.id
        };
      });

      // Mark overdue payments (no payment in previous months of current year)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      if (selectedYear === currentYear) {
        for (let month = 0; month <= currentMonth; month++) {
          if (matrix[tenant.id][month].status === 'none') {
            matrix[tenant.id][month] = {
              status: 'overdue'
            };
          }
        }
      }
    });

    return matrix;
  }, [tenants, receipts, selectedYear]);

  const getCellIcon = (cell: PaymentCell) => {
    switch (cell.status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-200" />;
    }
  };

  const getCellColor = (cell: PaymentCell) => {
    switch (cell.status) {
      case 'paid':
        return 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 hover:bg-[var(--color-success)]/20';
      case 'pending':
        return 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 hover:bg-[var(--color-warning)]/20';
      case 'overdue':
        return 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/20';
      default:
        return 'bg-[var(--color-muted)]/10 border-[var(--color-border)] hover:bg-[var(--color-muted)]/20';
    }
  };

  // Group tenants by property
  const tenantsByProperty = useMemo(() => {
    const grouped: Record<string, typeof tenants> = {};
    tenants.forEach(tenant => {
      const propId = tenant.propertyId || 'unassigned';
      if (!grouped[propId]) grouped[propId] = [];
      grouped[propId].push(tenant);
    });
    return grouped;
  }, [tenants]);

  // Toggle property expansion
  const toggleProperty = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

  // Filter tenants based on status
  const filteredTenants = useMemo(() => {
    if (statusFilter === 'all') return tenants;
    return tenants.filter(tenant => {
      const tenantCells = paymentMatrix[tenant.id] || [];
      return tenantCells.some(cell => cell.status === statusFilter);
    });
  }, [tenants, paymentMatrix, statusFilter]);

  const getTotalPaid = (tenantId: string) => {
    return paymentMatrix[tenantId]?.reduce((total, cell) => {
      return total + (cell.status === 'paid' ? (cell.amount || 0) : 0);
    }, 0) || 0;
  };

  const getTotalExpected = (tenant: any) => {
    // Calculate expected payments based on lease terms
    // This is a simplified calculation - in reality you'd check lease dates
    const paidMonths = paymentMatrix[tenant.id]?.filter(cell => cell.status === 'paid').length || 0;
    return paidMonths * tenant.rent;
  };

  if (tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <DollarSign className="h-12 w-12 text-[var(--color-muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">No Tenants Yet</h3>
          <p className="text-[var(--color-muted-foreground)]">Add tenants to start tracking payments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Payment Tracking Matrix
          </h2>
          <p className="text-[var(--color-muted-foreground)]">Monthly payment status overview for all tenants</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[var(--color-border)] p-1">
            <Button
              variant={viewMode === 'detailed' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('detailed')}
              className="h-7 px-3"
            >
              Detailed
            </Button>
            <Button
              variant={viewMode === 'heatmap' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('heatmap')}
              className="h-7 px-3"
            >
              Heatmap
            </Button>
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Export Button */}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatCurrency(tenants.reduce((total, tenant) => total + getTotalExpected(tenant), 0))}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">For {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">Total Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatCurrency(tenants.reduce((total, tenant) => total + getTotalPaid(tenant.id), 0))}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Paid amounts</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-[var(--color-warning)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {formatCurrency(
                tenants.reduce((total, tenant) => total + getTotalExpected(tenant), 0) -
                tenants.reduce((total, tenant) => total + getTotalPaid(tenant.id), 0)
              )}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Pending payments</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">Collection Rate</CardTitle>
            <Calendar className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {tenants.length > 0
                ? Math.round(
                    (tenants.reduce((total, tenant) => total + getTotalPaid(tenant.id), 0) /
                     tenants.reduce((total, tenant) => total + getTotalExpected(tenant), 0)) * 100
                  )
                : 0
              }%
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Payment success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--color-foreground)]">Payment Matrix - {selectedYear}</CardTitle>
            <CardDescription>
              Green: Paid • Yellow: Pending • Red: Overdue • Gray: No payment due
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <motion.table
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <thead>
                  <motion.tr
                    className="border-b border-[var(--color-border)]"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <th className="text-left py-3 px-4 font-medium text-[var(--color-muted-foreground)]">Tenant</th>
                    {months.map((month, index) => (
                      <motion.th
                        key={month}
                        className="text-center py-3 px-2 font-medium text-[var(--color-muted-foreground)] text-sm"
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + (index * 0.05) }}
                      >
                        {month}
                      </motion.th>
                    ))}
                    <th className="text-right py-3 px-4 font-medium text-[var(--color-muted-foreground)]">Total</th>
                  </motion.tr>
                </thead>
                <AnimatePresence>
                  <motion.tbody
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {filteredTenants.map((tenant, tenantIndex) => (
                      <motion.tr
                        key={tenant.id}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors duration-200"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + (tenantIndex * 0.1) }}
                      >
                        <td className="py-3 px-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 + (tenantIndex * 0.1) }}
                          >
                            <div className="font-medium text-[var(--color-foreground)]">{tenant.name}</div>
                            <div className="text-sm text-[var(--color-muted-foreground)]">{formatCurrency(tenant.rent)}/mo</div>
                          </motion.div>
                        </td>
                        {months.map((month, monthIndex) => {
                          const cell = paymentMatrix[tenant.id]?.[monthIndex] || { status: 'none' };
                          return (
                            <motion.td
                              key={month}
                              className="py-3 px-2 text-center"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.8 + (tenantIndex * 0.1) + (monthIndex * 0.05) }}
                            >
                              <motion.div
                                className={`inline-flex items-center justify-center w-8 h-8 rounded border ${getCellColor(cell)} cursor-pointer transition-all duration-200 hover:scale-110`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                title={
                                  cell.date
                                    ? `${cell.status} on ${new Date(cell.date).toLocaleDateString()} - ${formatCurrency(cell.amount || 0)}`
                                    : cell.status === 'overdue'
                                    ? 'Overdue payment'
                                    : 'No payment'
                                }
                              >
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 1 + (tenantIndex * 0.1) + (monthIndex * 0.05) }}
                                >
                                  {getCellIcon(cell)}
                                </motion.div>
                              </motion.div>
                            </motion.td>
                          );
                        })}
                        <td className="py-3 px-4 text-right">
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + (tenantIndex * 0.1) }}
                          >
                            <div className="font-medium text-[var(--color-foreground)]">
                              {formatCurrency(getTotalPaid(tenant.id))}
                            </div>
                            <div className="text-sm text-[var(--color-muted-foreground)]">
                              of {formatCurrency(getTotalExpected(tenant))}
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
              </motion.table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Legend */}
      <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
              <span className="text-sm text-[var(--color-muted-foreground)]">Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-warning)]" />
              <span className="text-sm text-[var(--color-muted-foreground)]">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-[var(--color-error)]" />
              <span className="text-sm text-[var(--color-muted-foreground)]">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--color-muted)]" />
              <span className="text-sm text-[var(--color-muted-foreground)]">No payment due</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}