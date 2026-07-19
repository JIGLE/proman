"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { useApp } from "@/lib/contexts/app-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { getActiveLease } from "@/lib/utils/lease-helpers";
import { cn } from "@/lib/utils/utils";
import { PaymentMatrixView } from "./payment-matrix-view";
import { ReceiptsView } from "./receipts-view";
import { RentRollView } from "./rent-roll-view";
import { YearlyRentMatrix } from "./yearly-rent-matrix";
import { BankMovementsInbox } from "./bank-movements-inbox";
import { ReceiptAutomationQueue } from "./receipt-automation-queue";
import { TaxConnectorDashboard } from "./tax-connector-dashboard";
import { FinancialsView } from "./financials-view";
import { BadgeEuro, FileText, Grid3X3, Landmark, Plus, Receipt } from "lucide-react";

type PaymentTab = "queue" | "receipts" | "rent-matrix" | "bank" | "rent-roll" | "tax";

export function FinancialsContainer() {
  const [activeTab, setActiveTab] = useTabPersistence("payments", "queue");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const propertyId = searchParams.get("propertyId") ?? undefined;
  const tabParam = searchParams.get("tab") as PaymentTab | "overview" | null;
  const { state } = useApp();
  const { formatCurrency } = useCurrency();
  const { isOwnerPortal } = usePortalAccess();
  // `ReceiptsView` (which owns the record-payment dialog) only mounts while the Receipts
  // tab is the active TabsContent — Radix unmounts inactive tab panels by default. The
  // header "Record payment" button used to poke a ref, which silently no-op'd whenever
  // another tab (e.g. the default "Due & Overdue" queue) was active. Instead: switch to
  // the Receipts tab and raise a signal that `ReceiptsView` opens itself from — robust to
  // the tab-mount + `router.replace` re-render that `setActiveTab` triggers.
  const [pendingRecordPayment, setPendingRecordPayment] = useState(
    () => searchParams.get("action") === "record-payment",
  );

  // If we arrived via the ?action=record-payment deep link, drop the param once consumed.
  useEffect(() => {
    if (pendingRecordPayment && searchParams.get("action") === "record-payment") {
      router.replace(pathname);
    }
  }, [pendingRecordPayment, router, pathname, searchParams]);

  useEffect(() => {
    if (
      tabParam === "receipts" ||
      tabParam === "queue" ||
      tabParam === "rent-matrix" ||
      tabParam === "bank" ||
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
              <Button
                onClick={() => {
                  setPendingRecordPayment(true);
                  setActiveTab("receipts");
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Record payment
              </Button>
            </>
          )}
        </div>
      </div>

      {isOwnerPortal ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={cn(
              "panel p-4 text-left transition-colors hover:border-[var(--color-border-hover)]",
              metrics.overdueAmount > 0 &&
                "border-l-[3px] border-l-[var(--semantic-danger)] bg-[var(--semantic-danger-soft)]",
            )}
          >
            <p className="mono-label">Overdue rent</p>
            <p
              className={cn(
                "mt-2 text-xl font-light tabular-nums sm:text-2xl",
                metrics.overdueAmount > 0
                  ? "text-[var(--semantic-danger)]"
                  : "text-[var(--color-foreground)]",
              )}
            >
              {formatCurrency(metrics.overdueAmount)}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Total expected rent currently marked overdue
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className={cn(
              "panel p-4 text-left transition-colors hover:border-[var(--color-border-hover)]",
              metrics.pendingReceipts > 0 &&
                "border-l-[3px] border-l-[var(--country-highlight-readable)] bg-[var(--country-highlight-soft)]",
            )}
          >
            <p className="mono-label">Pending receipts</p>
            <p className="mt-2 text-xl font-light tabular-nums text-[var(--color-foreground)] sm:text-2xl">
              {metrics.pendingReceipts}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Records that still need payment or receipt follow-up
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className="panel p-4 text-left transition-colors hover:border-[var(--color-border-hover)]"
          >
            <p className="mono-label">Collected this month</p>
            <p className="mt-2 text-xl font-light tabular-nums text-[var(--semantic-success)] sm:text-2xl">
              {formatCurrency(metrics.monthlyCollected)}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Paid rent already received this month
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tax")}
            className="panel p-4 text-left transition-colors hover:border-[var(--color-border-hover)]"
          >
            <p className="mono-label">Tax-linked leases</p>
            <p className="mt-2 text-xl font-light tabular-nums text-[var(--color-foreground)] sm:text-2xl">
              {metrics.taxTrackedLeases}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Lease records carrying PT/ES tax configuration
            </p>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="panel border-l-[3px] border-l-[var(--country-highlight-readable)] p-4">
            <p className="mono-label">Next rent</p>
            <p className="mt-2 text-xl font-light tabular-nums text-[var(--color-foreground)] sm:text-2xl">
              {formatCurrency(tenantLease?.monthlyRent ?? tenantSummary?.rent ?? 0)}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Expected amount for your current lease
            </p>
          </div>
          <div className="panel p-4">
            <p className="mono-label">Receipts available</p>
            <p className="mt-2 text-xl font-light tabular-nums text-[var(--color-foreground)] sm:text-2xl">
              {tenantPaidReceipts.length}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Paid records ready to review or download
            </p>
          </div>
          <div
            className={cn(
              "panel p-4",
              tenantSummary?.paymentStatus === "overdue" &&
                "border-l-[3px] border-l-[var(--semantic-danger)] bg-[var(--semantic-danger-soft)]",
            )}
          >
            <p className="mono-label">Current status</p>
            <p
              className={cn(
                "mt-2 text-xl font-light capitalize tabular-nums sm:text-2xl",
                tenantSummary?.paymentStatus === "overdue"
                  ? "text-[var(--semantic-danger)]"
                  : "text-[var(--color-foreground)]",
              )}
            >
              {tenantSummary?.paymentStatus ?? "pending"}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Latest payment state linked to your tenancy
            </p>
          </div>
          <div className="panel p-4">
            <p className="mono-label">Lease status</p>
            <p className="mt-2 text-xl font-light capitalize tabular-nums text-[var(--color-foreground)] sm:text-2xl">
              {tenantLease?.status ?? "active"}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
              Your current contract status
            </p>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PaymentTab)}
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList
            className={cn(
              "w-full",
              isOwnerPortal
                ? "flex max-w-full justify-start gap-1 overflow-x-auto"
                : "grid max-w-sm grid-cols-1",
            )}
          >
            {isOwnerPortal && (
              <TabsTrigger value="queue" className="flex shrink-0 items-center gap-2">
                <Grid3X3 className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Due &amp; Overdue</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="receipts" className="flex shrink-0 items-center gap-2">
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">
                {isOwnerPortal ? "Receipts" : "Payment History"}
              </span>
            </TabsTrigger>
            {isOwnerPortal && (
              <>
                <TabsTrigger value="rent-matrix" className="flex shrink-0 items-center gap-2">
                  <Grid3X3 className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Rent Matrix</span>
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex shrink-0 items-center gap-2">
                  <Landmark className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Bank Movements</span>
                </TabsTrigger>
                <TabsTrigger value="rent-roll" className="flex shrink-0 items-center gap-2">
                  <BadgeEuro className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Occupancy & Rent</span>
                </TabsTrigger>
                <TabsTrigger value="tax" className="flex shrink-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Tax Summary</span>
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

        <TabsContent value="receipts" className="mt-0 space-y-4">
          {isOwnerPortal && <ReceiptAutomationQueue />}
          <ReceiptsView
            tenantId={tenantId}
            propertyId={propertyId}
            openDialogSignal={pendingRecordPayment}
            onDialogOpened={() => setPendingRecordPayment(false)}
          />
        </TabsContent>

        {isOwnerPortal && (
          <TabsContent value="rent-matrix" className="mt-0">
            <YearlyRentMatrix />
          </TabsContent>
        )}

        {isOwnerPortal && (
          <TabsContent value="bank" className="mt-0">
            <BankMovementsInbox />
          </TabsContent>
        )}

        {isOwnerPortal && (
          <TabsContent value="rent-roll" className="mt-0">
            <RentRollView />
          </TabsContent>
        )}

        {isOwnerPortal && (
          <TabsContent value="tax" className="mt-0 space-y-4">
            <TaxConnectorDashboard />
            <FinancialsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
