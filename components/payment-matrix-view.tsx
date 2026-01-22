import { useState, useMemo } from "react";
import { useApp } from "@/lib/app-context-db";
import { useCurrency } from "@/lib/currency-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";
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
  const { tenants, receipts } = state;
  const { formatCurrency } = useCurrency();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'overdue':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

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
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tenants Yet</h3>
          <p className="text-gray-500">Add tenants to start tracking payments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Payment Tracking Matrix
          </h2>
          <p className="text-zinc-400">Monthly payment status overview for all tenants</p>
        </div>
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              {formatCurrency(tenants.reduce((total, tenant) => total + getTotalExpected(tenant), 0))}
            </div>
            <p className="text-xs text-zinc-400">For {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              {formatCurrency(tenants.reduce((total, tenant) => total + getTotalPaid(tenant.id), 0))}
            </div>
            <p className="text-xs text-zinc-400">Paid amounts</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              {formatCurrency(
                tenants.reduce((total, tenant) => total + getTotalExpected(tenant), 0) -
                tenants.reduce((total, tenant) => total + getTotalPaid(tenant.id), 0)
              )}
            </div>
            <p className="text-xs text-zinc-400">Pending payments</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Collection Rate</CardTitle>
            <Calendar className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-50">
              {tenants.length > 0
                ? Math.round(
                    (tenants.reduce((total, tenant) => total + getTotalPaid(tenant.id), 0) /
                     tenants.reduce((total, tenant) => total + getTotalExpected(tenant), 0)) * 100
                  )
                : 0
              }%
            </div>
            <p className="text-xs text-zinc-400">Payment success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-50">Payment Matrix - {selectedYear}</CardTitle>
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
                    className="border-b border-zinc-700"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <th className="text-left py-3 px-4 font-medium text-zinc-400">Tenant</th>
                    {months.map((month, index) => (
                      <motion.th
                        key={month}
                        className="text-center py-3 px-2 font-medium text-zinc-400 text-sm"
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + (index * 0.05) }}
                      >
                        {month}
                      </motion.th>
                    ))}
                    <th className="text-right py-3 px-4 font-medium text-zinc-400">Total</th>
                  </motion.tr>
                </thead>
                <AnimatePresence>
                  <motion.tbody
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {tenants.map((tenant, tenantIndex) => (
                      <motion.tr
                        key={tenant.id}
                        className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors duration-200"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + (tenantIndex * 0.1) }}
                        whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.8)' }}
                      >
                        <td className="py-3 px-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 + (tenantIndex * 0.1) }}
                          >
                            <div className="font-medium text-zinc-50">{tenant.name}</div>
                            <div className="text-sm text-zinc-400">{formatCurrency(tenant.rent)}/mo</div>
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
                            <div className="font-medium text-zinc-50">
                              {formatCurrency(getTotalPaid(tenant.id))}
                            </div>
                            <div className="text-sm text-zinc-400">
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
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-zinc-400">Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-zinc-400">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-zinc-400">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-200" />
              <span className="text-sm text-zinc-400">No payment due</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}