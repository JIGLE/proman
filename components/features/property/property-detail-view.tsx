"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  ArrowLeft,
  Users,
  FileText,
  Wrench,
  DollarSign,
  Receipt,
  Plus,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/utils";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/contexts/app-context";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { EntityLink } from "@/components/shared/entity-link";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { buildLocalizedFinancialReviewPath } from "@/lib/utils/financial-navigation";
import {
  expenseSchema,
  EXPENSE_CATEGORIES,
  type ExpenseFormData,
} from "@/lib/schemas/expense.schema";
import { receiptSchema, type ReceiptFormData } from "@/lib/schemas/receipt.schema";

interface PropertyDetailViewProps {
  propertyId: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  occupied: "default",
  vacant: "secondary",
  maintenance: "destructive",
};

export function PropertyDetailView({ propertyId }: PropertyDetailViewProps) {
  const { state, refreshData, addExpense, addReceipt } = useApp();
  const { formatCurrency } = useCurrency();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "pt";
  const [activeTab, setActiveTab] = useTabPersistence("property-detail", "overview");
  const t = useTranslations("propertyDetail");
  const tFin = useTranslations("financial");
  // (no debug logs in production view)

  // Ownership assignment state
  const [ownerAssignOwnerId, setOwnerAssignOwnerId] = useState("");
  const [ownerAssignPct, setOwnerAssignPct] = useState<number | "">("");
  const [ownerAssignError, setOwnerAssignError] = useState("");
  const [ownerAssignSaving, setOwnerAssignSaving] = useState(false);

  // Stable initialData and onSubmit for quick-add dialogs (prevents infinite re-render loop)
  const expenseInitialData = useMemo<ExpenseFormData>(
    () => ({
      propertyId,
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      category: "other" as const,
      description: "",
      isDeductible: true,
    }),
    [propertyId],
  );

  const handleExpenseSubmit = useCallback(
    async (data: ExpenseFormData) => {
      await addExpense({ ...data, propertyId });
    },
    [addExpense, propertyId],
  );

  const receiptInitialData = useMemo<ReceiptFormData>(
    () => ({
      tenantId: "",
      propertyId,
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      type: "rent",
      status: "paid",
      description: "",
    }),
    [propertyId],
  );

  const handleReceiptSubmit = useCallback(
    async (data: ReceiptFormData) => {
      await addReceipt({ ...data, propertyId });
    },
    [addReceipt, propertyId],
  );

  // Quick-add: Expense dialog (pre-filled with this property)
  const expenseDialog = useFormDialog<ExpenseFormData>({
    schema: expenseSchema,
    initialData: expenseInitialData,
    onSubmit: handleExpenseSubmit,
    successMessage: { create: "Expense recorded!", update: "Expense updated!" },
    errorMessage: "Failed to save expense.",
  });

  // Quick-add: Receipt / payment dialog (pre-filled with this property)
  const receiptDialog = useFormDialog<ReceiptFormData>({
    schema: receiptSchema,
    initialData: receiptInitialData,
    onSubmit: handleReceiptSubmit,
    successMessage: { create: "Payment recorded!", update: "Payment updated!" },
    errorMessage: "Failed to record payment.",
  });

  const property = state.properties.find((p) => p.id === propertyId);

  // Related entities
  const relatedTenants = useMemo(
    () => state.tenants.filter((t) => t.propertyId === propertyId),
    [state.tenants, propertyId],
  );
  const relatedLeases = useMemo(
    () => state.leases.filter((l) => l.propertyId === propertyId),
    [state.leases, propertyId],
  );
  const relatedMaintenance = useMemo(
    () => state.maintenance.filter((m) => m.propertyId === propertyId),
    [state.maintenance, propertyId],
  );
  const relatedReceipts = useMemo(
    () => state.receipts.filter((r) => r.propertyId === propertyId),
    [state.receipts, propertyId],
  );
  const relatedExpenses = useMemo(
    () => state.expenses.filter((e) => e.propertyId === propertyId),
    [state.expenses, propertyId],
  );

  const totalRevenue = relatedReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = relatedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netOperatingIncome = totalRevenue - totalExpenses;
  const openTickets = relatedMaintenance.filter(
    (m) => m.status === "open" || m.status === "in_progress",
  ).length;
  const activeLeasesList = relatedLeases.filter((l) => l.status === "active");
  const activeLeases = activeLeasesList.length;

  // Ownership: derive from owners state
  const propertyOwners = useMemo(
    () =>
      state.owners
        .filter((o) => o.properties?.some((po) => po.propertyId === propertyId))
        .map((o) => ({
          owner: o,
          assignment: o.properties!.find((po) => po.propertyId === propertyId)!,
        })),
    [state.owners, propertyId],
  );
  const ownershipTotal = propertyOwners.reduce(
    (s, { assignment }) => s + assignment.ownershipPercentage,
    0,
  );
  const unassignedOwners = state.owners.filter(
    (o) => !o.properties?.some((po) => po.propertyId === propertyId),
  );

  const handleAssignOwner = async () => {
    if (!ownerAssignOwnerId || ownerAssignPct === "") {
      setOwnerAssignError("Select an owner and enter a percentage.");
      return;
    }
    const pct = Number(ownerAssignPct);
    if (pct <= 0 || pct > 100) {
      setOwnerAssignError("Percentage must be between 1 and 100.");
      return;
    }
    if (ownershipTotal + pct > 100.001) {
      setOwnerAssignError(`Total would exceed 100% (current: ${ownershipTotal.toFixed(1)}%).`);
      return;
    }
    setOwnerAssignError("");
    setOwnerAssignSaving(true);
    try {
      const res = await fetch("/api/property-owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, ownerId: ownerAssignOwnerId, ownershipPercentage: pct }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setOwnerAssignError(json?.error ?? "Failed to assign owner.");
        return;
      }
      setOwnerAssignOwnerId("");
      setOwnerAssignPct("");
      await refreshData();
    } catch {
      setOwnerAssignError("Network error. Please try again.");
    } finally {
      setOwnerAssignSaving(false);
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    try {
      await fetch(`/api/property-owners?propertyId=${propertyId}&ownerId=${ownerId}`, {
        method: "DELETE",
      });
      await refreshData();
    } catch {
      // Silently fail in demo mode
    }
  };

  // Collection rate: percentage of expected rent actually received
  const collectionMetrics = useMemo(() => {
    const totalExpectedRent = activeLeasesList.reduce((sum, l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const now = new Date();
      const effectiveEnd = end < now ? end : now;
      // Count months the lease has been active
      const months =
        (effectiveEnd.getFullYear() - start.getFullYear()) * 12 +
        (effectiveEnd.getMonth() - start.getMonth()) +
        1;
      return sum + l.monthlyRent * Math.max(months, 0);
    }, 0);
    const paidReceipts = relatedReceipts
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amount, 0);
    const collectionRate = totalExpectedRent > 0 ? (paidReceipts / totalExpectedRent) * 100 : 0;
    return { totalExpectedRent, paidReceipts, collectionRate };
  }, [activeLeasesList, relatedReceipts]);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[var(--color-muted-foreground)]">{t("notFound")}</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/portfolio`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.backToProperties")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 lg:p-4 rounded-xl bg-[var(--color-info-muted)]">
              <Building2 className="h-8 w-8 lg:h-10 lg:w-10 text-[var(--color-info)]" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-foreground)]">
                {property.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-muted-foreground)]">
                <MapPin className="h-4 w-4" />
                <span>{property.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={STATUS_VARIANT[property.status] || "secondary"}>
                  {t(`status.${property.status}`) || property.status}
                </Badge>
                <span className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-1">
                  <Bed className="h-3.5 w-3.5" /> {property.bedrooms}
                </span>
                <span className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-1">
                  <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
                </span>
                <span className="text-sm font-medium">{formatCurrency(property.rent)}/mo</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(buildLocalizedFinancialReviewPath(locale, { propertyId: property.id }))
              }
            >
              <DollarSign className="h-4 w-4 mr-1" /> {t("actions.reviewPayments")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${locale}/documents?propertyId=${property.id}`)}
            >
              <FileText className="h-4 w-4 mr-1" /> {t("actions.documents")}
            </Button>

            {/* Quick add: Expense */}
            <Dialog
              open={expenseDialog.isOpen}
              onOpenChange={(open) => !open && expenseDialog.closeDialog()}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={expenseDialog.openDialog}>
                  <Wrench className="h-4 w-4 mr-1" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                  <DialogDescription>Log a cost for {property.name}</DialogDescription>
                </DialogHeader>
                <form onSubmit={expenseDialog.handleSubmit} className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="exp-category">Category</Label>
                      <Select
                        value={expenseDialog.formData.category}
                        onValueChange={(v) =>
                          expenseDialog.updateFormData({
                            category: v as ExpenseFormData["category"],
                          })
                        }
                      >
                        <SelectTrigger id="exp-category">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="exp-amount">Amount</Label>
                      <Input
                        id="exp-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={expenseDialog.formData.amount || ""}
                        onChange={(e) =>
                          expenseDialog.updateFormData({ amount: parseFloat(e.target.value) || 0 })
                        }
                        className={
                          expenseDialog.formErrors.amount ? "border-[var(--color-destructive)]" : ""
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-date">Date</Label>
                    <Input
                      id="exp-date"
                      type="date"
                      value={expenseDialog.formData.date}
                      onChange={(e) => expenseDialog.updateFormData({ date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-desc">Description (optional)</Label>
                    <Textarea
                      id="exp-desc"
                      rows={2}
                      placeholder="Notes…"
                      value={expenseDialog.formData.description || ""}
                      onChange={(e) =>
                        expenseDialog.updateFormData({ description: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={expenseDialog.closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={expenseDialog.isSubmitting}>
                      Save Expense
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Quick add: Receipt / payment */}
            <Dialog
              open={receiptDialog.isOpen}
              onOpenChange={(open) => !open && receiptDialog.closeDialog()}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="primary"
                  emphasis="high"
                  onClick={receiptDialog.openDialog}
                  className="ml-1"
                >
                  <Receipt className="h-4 w-4 mr-1" /> Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Log a rent or deposit payment for {property.name}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={receiptDialog.handleSubmit} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="rec-tenant">Tenant</Label>
                    <Select
                      value={receiptDialog.formData.tenantId}
                      onValueChange={(v) => receiptDialog.updateFormData({ tenantId: v })}
                    >
                      <SelectTrigger
                        id="rec-tenant"
                        className={
                          receiptDialog.formErrors.tenantId
                            ? "border-[var(--color-destructive)]"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {relatedTenants.map((ten) => (
                          <SelectItem key={ten.id} value={ten.id}>
                            {ten.name}
                          </SelectItem>
                        ))}
                        {state.tenants
                          .filter((ten) => !relatedTenants.some((rt) => rt.id === ten.id))
                          .map((ten) => (
                            <SelectItem key={ten.id} value={ten.id}>
                              {ten.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {receiptDialog.formErrors.tenantId && (
                      <p className="text-xs text-[var(--color-destructive)]">
                        {receiptDialog.formErrors.tenantId}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="rec-amount">Amount</Label>
                      <Input
                        id="rec-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={receiptDialog.formData.amount || ""}
                        onChange={(e) =>
                          receiptDialog.updateFormData({ amount: parseFloat(e.target.value) || 0 })
                        }
                        className={
                          receiptDialog.formErrors.amount ? "border-[var(--color-destructive)]" : ""
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rec-type">Type</Label>
                      <Select
                        value={receiptDialog.formData.type}
                        onValueChange={(v) =>
                          receiptDialog.updateFormData({ type: v as ReceiptFormData["type"] })
                        }
                      >
                        <SelectTrigger id="rec-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="rec-date">Date</Label>
                      <Input
                        id="rec-date"
                        type="date"
                        value={receiptDialog.formData.date}
                        onChange={(e) => receiptDialog.updateFormData({ date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rec-status">Status</Label>
                      <Select
                        value={receiptDialog.formData.status}
                        onValueChange={(v) =>
                          receiptDialog.updateFormData({ status: v as ReceiptFormData["status"] })
                        }
                      >
                        <SelectTrigger id="rec-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={receiptDialog.closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={receiptDialog.isSubmitting}>
                      Save Payment
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer transition-colors hover:border-zinc-600"
            onClick={() => setActiveTab("tenants")}
          >
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">
                {t("stats.tenants")}
              </div>
              <div className="text-2xl font-bold mt-1">{relatedTenants.length}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-colors hover:border-zinc-600"
            onClick={() => setActiveTab("leases")}
          >
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">
                {t("stats.activeLeases")}
              </div>
              <div className="text-2xl font-bold text-[var(--color-success)] mt-1">
                {activeLeases}
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-colors hover:border-zinc-600"
            onClick={() => setActiveTab("finance")}
          >
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">
                {t("stats.revenue")}
              </div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-colors hover:border-zinc-600"
            onClick={() => setActiveTab("maintenance")}
          >
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">
                {t("stats.openTickets")}
              </div>
              <div className="text-2xl font-bold text-[var(--color-warning)] mt-1">
                {openTickets}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {t("tabs.tenants")}
            {relatedTenants.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {relatedTenants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leases" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("tabs.leases")}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            {t("tabs.maintenance")}
            {openTickets > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-warning-muted)] text-[var(--color-warning)] px-2 py-0.5 text-xs">
                {openTickets}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            {t("tabs.expenses")}
            {relatedExpenses.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {relatedExpenses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            {t("tabs.payments")}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("propertyDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">{t("type")}</span>
                    <p className="font-medium capitalize">{property.type}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">{t("monthlyRent")}</span>
                    <p className="font-medium">{formatCurrency(property.rent)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">{t("bedrooms")}</span>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">{t("bathrooms")}</span>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                  {property.description && (
                    <div className="col-span-2">
                      <span className="text-[var(--color-muted-foreground)]">
                        {t("description")}
                      </span>
                      <p className="font-medium">{property.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Entities */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                {t("related")}
              </h3>
              {relatedTenants.map((tenant) => (
                <EntityLink
                  key={tenant.id}
                  type="tenant"
                  id={tenant.id}
                  title={tenant.name}
                  subtitle={tenant.email}
                  status={tenant.paymentStatus}
                  statusVariant={
                    tenant.paymentStatus === "paid"
                      ? "success"
                      : tenant.paymentStatus === "overdue"
                        ? "destructive"
                        : "warning"
                  }
                />
              ))}
              {relatedLeases
                .filter((l) => l.status === "active")
                .map((lease) => (
                  <EntityLink
                    key={lease.id}
                    type="lease"
                    id={lease.id}
                    title={`Lease ${lease.id.slice(0, 8)}`}
                    subtitle={`${lease.startDate} — ${lease.endDate}`}
                    status={lease.status}
                    statusVariant="success"
                  />
                ))}
              {relatedTenants.length === 0 &&
                relatedLeases.filter((l) => l.status === "active").length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center space-y-2">
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {property.status === "vacant" ? t("vacantNotice") : t("noRelatedEntities")}
                    </p>
                    {property.status === "vacant" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/${locale}/leases`)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        {t("createLease")}
                      </Button>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Ownership & Revenue Share */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ownership
              </CardTitle>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  Math.abs(ownershipTotal - 100) < 0.01
                    ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                    : ownershipTotal > 0
                      ? "bg-[var(--color-warning-muted)] text-[var(--color-warning)]"
                      : "bg-zinc-800 text-zinc-500",
                )}
              >
                {ownershipTotal.toFixed(1)}% assigned
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {propertyOwners.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">No owners assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {propertyOwners.map(({ owner, assignment }) => {
                    const ownerIncome = relatedReceipts
                      .filter((r) => r.status === "paid")
                      .reduce((s, r) => s + r.amount * (assignment.ownershipPercentage / 100), 0);
                    return (
                      <div
                        key={owner.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{owner.name}</p>
                          <p className="text-xs text-zinc-500">{owner.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-zinc-200">
                            {assignment.ownershipPercentage}%
                          </p>
                          <p className="text-xs text-[var(--color-success)]">
                            {formatCurrency(ownerIncome)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-[var(--color-destructive)]"
                          onClick={() => handleRemoveOwner(owner.id)}
                          title="Remove owner"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add owner form */}
              {unassignedOwners.length > 0 && ownershipTotal < 99.999 && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                    Assign owner
                  </p>
                  <div className="flex gap-2">
                    <Select value={ownerAssignOwnerId} onValueChange={setOwnerAssignOwnerId}>
                      <SelectTrigger className="flex-1 text-sm">
                        <SelectValue placeholder="Select owner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedOwners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={100 - ownershipTotal}
                      step={0.1}
                      placeholder="%"
                      value={ownerAssignPct}
                      onChange={(e) =>
                        setOwnerAssignPct(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-20 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleAssignOwner}
                      disabled={ownerAssignSaving}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {ownerAssignError && (
                    <p className="text-xs text-[var(--color-destructive)]">{ownerAssignError}</p>
                  )}
                  {Math.abs(ownershipTotal + Number(ownerAssignPct || 0) - 100) < 0.01 && (
                    <p className="text-xs text-[var(--color-success)]">
                      Total will reach exactly 100% ✓
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tenants">
          {relatedTenants.length === 0 ? (
            <EmptyStateIllustration entityType="tenants" />
          ) : (
            <div className="grid gap-3">
              {relatedTenants.map((tenant) => (
                <EntityLink
                  key={tenant.id}
                  type="tenant"
                  id={tenant.id}
                  title={tenant.name}
                  subtitle={`${tenant.email} · ${tenant.phone}`}
                  status={tenant.paymentStatus}
                  statusVariant={
                    tenant.paymentStatus === "paid"
                      ? "success"
                      : tenant.paymentStatus === "overdue"
                        ? "destructive"
                        : "warning"
                  }
                  variant="full"
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leases Tab */}
        <TabsContent value="leases">
          {relatedLeases.length === 0 ? (
            <EmptyStateIllustration entityType="leases" />
          ) : (
            <div className="grid gap-3">
              {relatedLeases.map((lease) => {
                const daysUntilExpiry = Math.ceil(
                  (new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                );
                const isExpiring =
                  lease.status === "active" && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                return (
                  <div key={lease.id} className="space-y-1">
                    <EntityLink
                      type="lease"
                      id={lease.id}
                      title={`Lease ${lease.id.slice(0, 8)}`}
                      subtitle={`${formatCurrency(lease.monthlyRent)}/mo · ${lease.startDate} — ${lease.endDate}`}
                      status={lease.status}
                      statusVariant={
                        lease.status === "active"
                          ? "success"
                          : lease.status === "expired"
                            ? "destructive"
                            : "warning"
                      }
                      variant="full"
                    />
                    {isExpiring && (
                      <div className="flex items-center justify-between rounded-md border border-[var(--color-warning)]/20 bg-[var(--color-warning-muted)] px-3 py-1.5">
                        <span className="text-xs text-[var(--color-warning)]">
                          {t("expiresIn", { days: daysUntilExpiry })}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-2 text-xs text-[var(--color-warning)] hover:bg-[var(--color-warning-muted)] hover:text-[var(--color-warning)]"
                          onClick={() => router.push(`/${locale}/leases`)}
                        >
                          {t("renew")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          {relatedMaintenance.length === 0 ? (
            <EmptyStateIllustration entityType="maintenance" />
          ) : (
            <div className="space-y-3">
              {openTickets > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-warning)]">
                    {openTickets} open ticket{openTickets !== 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/${locale}/maintenance?propertyId=${propertyId}`)}
                  >
                    <Wrench className="h-3.5 w-3.5 mr-1.5" />
                    View in Maintenance
                  </Button>
                </div>
              )}
              {relatedMaintenance.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{ticket.title}</p>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            ticket.priority === "urgent" || ticket.priority === "high"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {ticket.priority}
                        </Badge>
                        <Badge
                          variant={
                            ticket.status === "resolved" || ticket.status === "closed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {relatedExpenses.length === 0 ? (
            <EmptyStateIllustration entityType="expenses" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {relatedExpenses.length > 0 && (
                    <>
                      {tFin("totalExpenses")}:{" "}
                      <span className="font-semibold text-[var(--color-destructive)]">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/${locale}/financials?propertyId=${propertyId}`)}
                >
                  {tFin("addExpense")}
                </Button>
              </div>
              {relatedExpenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {tFin(`categories.${expense.category}`) || expense.category}
                          </p>
                          {expense.description && (
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                              {expense.description}
                            </p>
                          )}
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[var(--color-destructive)]">
                            -{formatCurrency(expense.amount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          {/* P&L Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">{t("finance.totalRevenue")}</div>
                <div className="text-2xl font-bold text-[var(--color-success)] mt-1">
                  {formatCurrency(totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">{t("finance.totalExpenses")}</div>
                <div className="text-2xl font-bold text-[var(--color-destructive)] mt-1">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">{t("finance.netOperatingIncome")}</div>
                <div
                  className={cn(
                    "text-2xl font-bold mt-1",
                    netOperatingIncome >= 0
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-destructive)]",
                  )}
                >
                  {formatCurrency(netOperatingIncome)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-sm text-zinc-400">{t("finance.collectionRate")}</div>
                <div
                  className={cn(
                    "text-2xl font-bold mt-1",
                    collectionMetrics.collectionRate >= 90
                      ? "text-[var(--color-success)]"
                      : collectionMetrics.collectionRate >= 70
                        ? "text-[var(--color-warning)]"
                        : "text-[var(--color-destructive)]",
                  )}
                >
                  {collectionMetrics.collectionRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {relatedReceipts.length === 0 && relatedExpenses.length === 0 ? (
            <EmptyStateIllustration entityType="receipts" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{tFin("recentTransactions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    ...relatedReceipts.map((r) => ({ ...r, txType: "receipt" as const })),
                    ...relatedExpenses.map((e) => ({ ...e, txType: "expense" as const })),
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {tx.txType === "receipt"
                              ? "Payment received"
                              : tx.category || "Expense"}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">{tx.date}</p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            tx.txType === "receipt"
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-destructive)]",
                          )}
                        >
                          {tx.txType === "receipt" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
