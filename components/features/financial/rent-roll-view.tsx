"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";

// Generate month options for last 12 months
function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export function RentRollView() {
  const { state } = useApp();
  const { leases, receipts, properties, tenants } = state;
  const { formatCurrency } = useCurrency();

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const rentRoll = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // Get active leases
    const activeLeases = leases.filter((l) => {
      if (l.status !== "active") return false;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);
      return start <= periodEnd && end >= periodStart;
    });

    return activeLeases.map((lease) => {
      const property = properties.find((p) => p.id === lease.propertyId);
      const tenant = tenants.find((t) => t.id === lease.tenantId);

      // Sum receipts for this property+tenant in the selected month
      const monthReceipts = receipts.filter((r) => {
        const rDate = new Date(r.date);
        return (
          r.propertyId === lease.propertyId &&
          r.tenantId === lease.tenantId &&
          rDate.getFullYear() === year &&
          rDate.getMonth() + 1 === month &&
          r.status === "paid"
        );
      });
      const received = monthReceipts.reduce((sum, r) => sum + r.amount, 0);
      const expected = lease.monthlyRent;
      const delta = received - expected;

      let status: "paid" | "partial" | "unpaid" = "unpaid";
      if (received >= expected) status = "paid";
      else if (received > 0) status = "partial";

      return {
        leaseId: lease.id,
        propertyName: property?.name ?? "Unknown",
        tenantName: tenant?.name ?? "Unknown",
        expected,
        received,
        delta,
        status,
      };
    });
  }, [leases, receipts, properties, tenants, selectedMonth]);

  const totals = useMemo(() => {
    return rentRoll.reduce(
      (acc, row) => ({
        expected: acc.expected + row.expected,
        received: acc.received + row.received,
        delta: acc.delta + row.delta,
      }),
      { expected: 0, received: 0, delta: 0 },
    );
  }, [rentRoll]);

  const statusBadge = (status: "paid" | "partial" | "unpaid") => {
    const styles = {
      paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      partial: "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
      unpaid: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    const labels = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };
    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Card className="bg-[var(--color-card)] border-[var(--color-border)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[var(--color-foreground)] flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Rent Roll
        </CardTitle>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {rentRoll.length === 0 ? (
          <p className="text-center text-[var(--color-muted-foreground)] py-8">No active leases for this period.</p>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)]">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--color-border)] hover:bg-transparent">
                  <TableHead className="text-[var(--color-muted-foreground)]">Property</TableHead>
                  <TableHead className="text-[var(--color-muted-foreground)]">Tenant</TableHead>
                  <TableHead className="text-[var(--color-muted-foreground)] text-right">Expected</TableHead>
                  <TableHead className="text-[var(--color-muted-foreground)] text-right">Received</TableHead>
                  <TableHead className="text-[var(--color-muted-foreground)] text-right">Delta</TableHead>
                  <TableHead className="text-[var(--color-muted-foreground)]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentRoll.map((row) => (
                  <TableRow key={row.leaseId} className="border-[var(--color-border)]">
                    <TableCell className="text-sm font-medium text-[var(--color-foreground)]">
                      {row.propertyName}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--color-muted-foreground)]">{row.tenantName}</TableCell>
                    <TableCell className="text-sm text-[var(--color-muted-foreground)] text-right">
                      {formatCurrency(row.expected)}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--color-foreground)] text-right">
                      {formatCurrency(row.received)}
                    </TableCell>
                    <TableCell
                      className={`text-sm text-right font-medium ${row.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {row.delta >= 0 ? "+" : ""}
                      {formatCurrency(row.delta)}
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-[var(--color-border)] bg-[var(--color-surface)]/30 font-semibold">
                  <TableCell className="text-sm text-[var(--color-foreground)]" colSpan={2}>
                    Totals
                  </TableCell>
                  <TableCell className="text-sm text-[var(--color-foreground)] text-right">
                    {formatCurrency(totals.expected)}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--color-foreground)] text-right">
                    {formatCurrency(totals.received)}
                  </TableCell>
                  <TableCell
                    className={`text-sm text-right font-medium ${totals.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {totals.delta >= 0 ? "+" : ""}
                    {formatCurrency(totals.delta)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
