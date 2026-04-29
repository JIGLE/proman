"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { getActiveLease } from "@/lib/utils/lease-helpers";
import { PaymentMatrixView } from "./payment-matrix-view";
import { ReceiptsView, ReceiptsViewRef } from "./receipts-view";
import { RentRollView } from "./rent-roll-view";
import { FinancialsView } from "./financials-view";
import {
  AlertTriangle,
  BadgeEuro,
  FileText,
  Grid3X3,
  Plus,
  Receipt,
  ShieldCheck,
} from "lucide-react";

type PaymentTab = "queue" | "receipts" | "rent-roll" | "tax";

export function FinancialsContainer() {
  const [activeTab, setActiveTab] = useTabPersistence("payments", "queue");
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const propertyId = searchParams.get("propertyId") ?? undefined;
  const tabParam = searchParams.get("tab") as PaymentTab | "overview" | null;
  const { state } = useApp();
  const { formatCurrency } = useCurrency();
  const { isOwnerPortal } = usePortalAccess();
  const receiptsViewRef = useRef<ReceiptsViewRef>(null);

  useEffect(() => {
    if (
      tabParam === "receipts" ||
      tabParam === "queue" ||
      tabParam === "rent-roll" ||
      tabParam === "tax"
    ) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam);
      }
      return;
    }

    if (tabParam === "overview" && activeTab !== "tax") {
      setActiveTab("tax");
    }
  }, [activeTab, setActiveTab, tabParam]);

  useEffect(() => {
    if (!isOwnerPortal && activeTab !== "receipts") {
      setActiveTab("receipts");
    }
  }, [activeTab, isOwnerPortal, setActiveTab]);

  useEffect(() => {
    if (searchParams.get("action") === "record-payment" && isOwnerPortal) {
      if (activeTab !== "receipts") {
        setActiveTab("receipts");
      }
      receiptsViewRef.current?.openDialog();
    }
  }, [activeTab, isOwnerPortal, searchParams, setActiveTab]);

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyCollected = state.receipts
      .filter((receipt) => {
        const receiptDate = new Date(receipt.date);
        return (
          receipt.status === "paid" &&
          receipt.type === "rent" &&
          receiptDate >= monthStart &&
          receiptDate <= monthEnd
        );
      })
      .reduce((sum, receipt) => sum + receipt.amount, 0);

    const overdueAmount = state.tenants
      .filter((tenant) => tenant.paymentStatus === "overdue")
      .reduce((sum, tenant) => {
        const activeLease = getActiveLease(tenant.id, state.leases);
        return sum + (activeLease?.monthlyRent ?? tenant.rent ?? 0);
      }, 0);

    const pendingReceipts = state.receipts.filter((receipt) => receipt.status === "pending").length;
    const taxTrackedLeases = state.leases.filter((lease) => lease.taxRegime).length;

    return {
      monthlyCollected,
      overdueAmount,
      pendingReceipts,
      taxTrackedLeases,
    };
  }, [state.leases, state.receipts, state.tenants]);

  const selectedTenant = tenantId
    ? state.tenants.find((tenant) => tenant.id === tenantId)
    : undefined;
  const selectedProperty = propertyId
    ? state.properties.find((property) => property.id === propertyId)
    : undefined;
  const tenantSummary = state.tenants[0];
  const tenantLease = tenantSummary ? getActiveLease(tenantSummary.id, state.leases) : null;
  const tenantPaidReceipts = state.receipts.filter((receipt) => receipt.status === "paid");

  const ownerDescription = tenantId
    ? `Review payment history, receipt output, and next collection steps for ${selectedTenant?.name ?? "the selected tenant"}.`
    : propertyId
      ? `Review rent status, receipts, and tax-ready outputs for ${selectedProperty?.name ?? "the selected property"}.`
      : "Track due rent, record payments, issue receipts, and review PT/ES tax-ready totals.";

  const tenantDescription =
    "Review your rent history, download receipts, and keep the next payment amount visible without owner-only accounting details.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            {isOwnerPortal ? "Payments" : "My payments"}
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {isOwnerPortal ? ownerDescription : tenantDescription}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwnerPortal && (
            <>
              <ExportButton
                data={state.receipts}
                filename="payments-export"
                columns={[
                  { key: "tenantName", label: "Tenant" },
                  { key: "propertyName", label: "Property" },
                  { key: "amount", label: "Amount" },
                  { key: "date", label: "Date" },
                  { key: "status", label: "Status" },
                ]}
              />
              <Button onClick={() => receiptsViewRef.current?.openDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Record payment
              </Button>
            </>
          )}
        </div>
      </div>

      {isOwnerPortal ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => setActiveTab("queue")} className="text-left w-full">
            <Card className="border-red-500/20 bg-red-500/5 cursor-pointer hover:ring-1 hover:ring-red-500/30 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue rent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {formatCurrency(metrics.overdueAmount)}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Total expected rent currently marked overdue
                </p>
              </CardContent>
            </Card>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className="text-left w-full"
          >
            <Card className="cursor-pointer hover:ring-1 hover:ring-white/10 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                  <BadgeEuro className="h-4 w-4 text-emerald-400" />
                  Collected this month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {formatCurrency(metrics.monthlyCollected)}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Paid rent already received this month
                </p>
              </CardContent>
            </Card>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className="text-left w-full"
          >
            <Card className="cursor-pointer hover:ring-1 hover:ring-white/10 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                  <Receipt className="h-4 w-4 text-blue-400" />
                  Pending receipts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {metrics.pendingReceipts}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Records that still need payment or receipt follow-up
                </p>
              </CardContent>
            </Card>
          </button>

          <button type="button" onClick={() => setActiveTab("tax")} className="text-left w-full">
            <Card className="cursor-pointer hover:ring-1 hover:ring-white/10 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                  <FileText className="h-4 w-4 text-amber-400" />
                  Tax-linked leases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[var(--color-foreground)]">
                  {metrics.taxTrackedLeases}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Lease records carrying PT/ES tax configuration
                </p>
              </CardContent>
            </Card>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-200">
                <BadgeEuro className="h-4 w-4" />
                Next rent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--color-foreground)]">
                {formatCurrency(tenantLease?.monthlyRent ?? tenantSummary?.rent ?? 0)}
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Expected amount for your current lease
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                <Receipt className="h-4 w-4 text-emerald-400" />
                Receipts available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--color-foreground)]">
                {tenantPaidReceipts.length}
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Paid records ready to review or download
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Current status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-[var(--color-foreground)]">
                {tenantSummary?.paymentStatus ?? "pending"}
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Latest payment state linked to your tenancy
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted-foreground)]">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Lease status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-[var(--color-foreground)]">
                {tenantLease?.status ?? "active"}
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Your current contract status
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PaymentTab)}
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList
            className={`grid w-full ${isOwnerPortal ? "max-w-3xl grid-cols-4" : "max-w-sm grid-cols-1"}`}
          >
            {isOwnerPortal && (
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                <span>Action Queue</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>{isOwnerPortal ? "Receipts" : "Payment History"}</span>
            </TabsTrigger>
            {isOwnerPortal && (
              <>
                <TabsTrigger value="rent-roll" className="flex items-center gap-2">
                  <BadgeEuro className="h-4 w-4" />
                  <span>Occupancy & Rent</span>
                </TabsTrigger>
                <TabsTrigger value="tax" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Tax Summary</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {isOwnerPortal && (
          <TabsContent value="queue" className="mt-0">
            <PaymentMatrixView />
          </TabsContent>
        )}

        <TabsContent value="receipts" className="mt-0">
          <ReceiptsView ref={receiptsViewRef} tenantId={tenantId} propertyId={propertyId} />
        </TabsContent>

        {isOwnerPortal && (
          <TabsContent value="rent-roll" className="mt-0">
            <RentRollView />
          </TabsContent>
        )}

        {isOwnerPortal && (
          <TabsContent value="tax" className="mt-0">
            <FinancialsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
