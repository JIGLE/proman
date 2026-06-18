"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileCheck2,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/contexts/toast-context";

type SubmissionStatus = "pending" | "submitted" | "confirmed" | "rejected";

interface Modelo179Submission {
  id: string;
  periodYear: number;
  status: SubmissionStatus;
  atReference: string | null;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string;
}

interface LeaseRow {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
  property: { id: string; name: string; address: string };
  tenant: { id: string; name: string; email: string };
  modelo179Submissions: Modelo179Submission[];
}

const statusConfig: Record<
  SubmissionStatus,
  { icon: React.ElementType; label: string; badgeClass: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  submitted: {
    icon: AlertCircle,
    label: "Submitted",
    badgeClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  confirmed: {
    icon: CheckCircle2,
    label: "Confirmed",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    badgeClass:
      "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
  },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function getSubmissionForYear(
  lease: LeaseRow,
  year: number,
): Modelo179Submission | undefined {
  return lease.modelo179Submissions.find((s) => s.periodYear === year);
}

function generateCsv(leases: LeaseRow[], year: number): string {
  const rows: string[][] = [
    [
      "Lease ID",
      "Property",
      "Address",
      "Tenant",
      "Tenant Email",
      "Lease Start",
      "Lease End",
      "Monthly Rent (EUR)",
      "Modelo 179 Status",
      "AT Reference",
      "Submitted At",
    ],
  ];

  for (const lease of leases) {
    const submission = getSubmissionForYear(lease, year);
    rows.push([
      lease.id,
      lease.property.name,
      lease.property.address,
      lease.tenant.name,
      lease.tenant.email,
      lease.startDate.slice(0, 10),
      lease.endDate.slice(0, 10),
      String(lease.monthlyRent),
      submission?.status ?? "pending",
      submission?.atReference ?? "",
      submission?.submittedAt ? submission.submittedAt.slice(0, 10) : "",
    ]);
  }

  return rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function Modelo179View(): React.ReactElement {
  const t = useTranslations("compliance");
  const { success, error: showError } = useToast();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<LeaseRow | null>(null);
  const [atRefInput, setAtRefInput] = useState("");
  const [saving, setSaving] = useState(false);

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/modelo179?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        setLeases((json.data as LeaseRow[]) ?? []);
      } else {
        showError("Failed to load Modelo 179 data");
      }
    } catch {
      showError("Failed to load Modelo 179 data");
    } finally {
      setLoading(false);
    }
  }, [year, showError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openMarkDialog = (lease: LeaseRow) => {
    setSelectedLease(lease);
    const existing = getSubmissionForYear(lease, year);
    setAtRefInput(existing?.atReference ?? "");
    setDialogOpen(true);
  };

  const handleMarkSubmitted = async () => {
    if (!selectedLease) return;
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/modelo179", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId: selectedLease.id,
          periodYear: year,
          status: "submitted",
          atReference: atRefInput || null,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        success("Modelo 179 marked as submitted");
        setDialogOpen(false);
        await loadData();
      } else {
        showError("Failed to update submission");
      }
    } catch {
      showError("Failed to update submission");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const csv = generateCsv(leases, year);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo179_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submittedCount = leases.filter((l) => {
    const s = getSubmissionForYear(l, year);
    return s && s.status !== "pending";
  }).length;

  const totalCount = leases.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <FileCheck2 className="h-6 w-6" />
            {t("modelo179Title")}
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("modelo179Subtitle")}</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={leases.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          {t("modelo179Export")}
        </Button>
      </div>

      {/* Year selector + summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!loading && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {submittedCount} of {totalCount} leases submitted for {year}
          </p>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t("modelo179Status")}</CardTitle>
          <CardDescription>
            {t("modelo179Subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : leases.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-8">
              No active leases found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="pb-3 text-left font-medium text-[var(--color-muted-foreground)]">
                      Tenant
                    </th>
                    <th className="pb-3 text-left font-medium text-[var(--color-muted-foreground)]">
                      Property
                    </th>
                    <th className="pb-3 text-left font-medium text-[var(--color-muted-foreground)]">
                      Period
                    </th>
                    <th className="pb-3 text-left font-medium text-[var(--color-muted-foreground)]">
                      {t("modelo179Status")}
                    </th>
                    <th className="pb-3 text-left font-medium text-[var(--color-muted-foreground)]">
                      {t("modelo179ATRef")}
                    </th>
                    <th className="pb-3 text-right font-medium text-[var(--color-muted-foreground)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {leases.map((lease) => {
                    const submission = getSubmissionForYear(lease, year);
                    const status: SubmissionStatus = submission?.status ?? "pending";
                    return (
                      <tr key={lease.id} className="group">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{lease.tenant.name}</div>
                          <div className="text-xs text-[var(--color-muted-foreground)]">
                            {lease.tenant.email}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div>{lease.property.name}</div>
                          <div className="text-xs text-[var(--color-muted-foreground)]">
                            {lease.property.address}
                          </div>
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {new Date(lease.startDate).getFullYear()} –{" "}
                          {new Date(lease.endDate).getFullYear()}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="py-3 pr-4 text-[var(--color-muted-foreground)]">
                          {submission?.atReference ?? "—"}
                        </td>
                        <td className="py-3 text-right">
                          {status !== "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMarkDialog(lease)}
                            >
                              Mark as Submitted
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Submitted dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Submitted to AT</DialogTitle>
            <DialogDescription>
              Enter the AT reference number for the Modelo 179 submission for{" "}
              {selectedLease?.tenant.name} — {selectedLease?.property.name} ({year}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="at-reference">{t("modelo179ATRef")}</Label>
              <Input
                id="at-reference"
                placeholder="e.g. AT2025-XXXXXXXX"
                value={atRefInput}
                onChange={(e) => setAtRefInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkSubmitted} disabled={saving}>
              {saving ? "Saving..." : "Mark as Submitted"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Modelo179View;
