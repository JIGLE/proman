"use client";

import { useMemo } from "react";
import { FileText, Edit, ArrowLeft, Calendar, RotateCcw, XCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { EntityLink } from "@/components/shared/entity-link";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";

interface LeaseDetailViewProps {
  leaseId: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  pending: "secondary",
  expired: "destructive",
  terminated: "destructive",
};

export function LeaseDetailView({ leaseId }: LeaseDetailViewProps) {
  const { state, updateLease } = useApp();
  const { formatCurrency } = useCurrency();
  const { success, error } = useToast();
  const confirmDialog = useConfirmDialog();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "pt";

  const lease = state.leases.find((l) => l.id === leaseId);

  // Related entities
  const property = lease ? state.properties.find((p) => p.id === lease.propertyId) : null;
  const tenant = lease ? state.tenants.find((t) => t.id === lease.tenantId) : null;
  const relatedReceipts = useMemo(
    () =>
      lease
        ? state.receipts.filter(
            (r) => r.propertyId === lease.propertyId && r.tenantId === lease.tenantId,
          )
        : [],
    [state.receipts, lease],
  );

  if (!lease) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[var(--color-muted-foreground)]">Lease not found</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/leases`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leases
        </Button>
      </div>
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const totalPaid = relatedReceipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);

  const handleEdit = () => {
    router.push(`/${locale}/leases?action=edit&id=${lease.id}`);
  };

  const handleRenew = () => {
    router.push(`/${locale}/leases?action=renew&id=${lease.id}`);
  };

  const handleTerminate = () => {
    confirmDialog.confirm(
      {
        title: "Terminate Lease",
        description: "This lease will be marked as terminated. This action cannot be undone.",
        confirmLabel: "Terminate",
        variant: "destructive",
      },
      async () => {
        try {
          await updateLease(lease.id, { status: "terminated" });
          success("Lease terminated");
          router.push(`/${locale}/leases`);
        } catch {
          error("Failed to terminate lease");
        }
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-violet-500/10">
            <FileText className="h-8 w-8 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Lease {lease.id.slice(0, 8)}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-muted-foreground)]">
              <Calendar className="h-4 w-4" />
              <span>
                {lease.startDate} — {lease.endDate}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={STATUS_VARIANT[lease.status] || "secondary"}>{lease.status}</Badge>
              <span className="text-sm font-medium">{formatCurrency(lease.monthlyRent)}/mo</span>
              {lease.autoRenew && <Badge variant="outline">Auto-renew</Badge>}
              {lease.status === "active" && daysUntilExpiry <= 60 && (
                <Badge variant="secondary" className="text-amber-500">
                  Expires in {daysUntilExpiry}d
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRenew}>
            <RotateCcw className="h-4 w-4 mr-1" /> Renew
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-600"
            onClick={handleTerminate}
            disabled={lease.status === "terminated"}
          >
            <XCircle className="h-4 w-4 mr-1" /> Terminate
          </Button>
        </div>
      </div>

      {/* Linked Entities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {property && (
          <EntityLink
            type="property"
            id={property.id}
            title={property.name}
            subtitle={property.address}
            status={property.status}
            statusVariant={
              property.status === "occupied"
                ? "success"
                : property.status === "vacant"
                  ? "warning"
                  : "destructive"
            }
            variant="full"
          />
        )}
        {tenant && (
          <EntityLink
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
        )}
      </div>

      {/* Lease Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <span className="text-[var(--color-muted-foreground)]">Monthly Rent</span>
              <p className="text-lg font-semibold mt-1">{formatCurrency(lease.monthlyRent)}</p>
            </div>
            <div>
              <span className="text-[var(--color-muted-foreground)]">Deposit</span>
              <p className="text-lg font-semibold mt-1">{formatCurrency(lease.deposit)}</p>
            </div>
            <div>
              <span className="text-[var(--color-muted-foreground)]">Start Date</span>
              <p className="text-lg font-semibold mt-1">{lease.startDate}</p>
            </div>
            <div>
              <span className="text-[var(--color-muted-foreground)]">End Date</span>
              <p className="text-lg font-semibold mt-1">{lease.endDate}</p>
            </div>
            {lease.taxRegime && (
              <div>
                <span className="text-[var(--color-muted-foreground)]">Tax Regime</span>
                <p className="font-medium mt-1">{lease.taxRegime}</p>
              </div>
            )}
            <div>
              <span className="text-[var(--color-muted-foreground)]">Auto-Renew</span>
              <p className="font-medium mt-1">{lease.autoRenew ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-[var(--color-muted-foreground)]">Notice Period</span>
              <p className="font-medium mt-1">{lease.renewalNoticeDays} days</p>
            </div>
          </div>

          {lease.notes && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-muted-foreground)]">Notes</span>
              <p className="text-sm mt-1">{lease.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              Total Paid:{" "}
              <span className="font-semibold text-green-500">{formatCurrency(totalPaid)}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {relatedReceipts.length === 0 ? (
            <EmptyStateIllustration entityType="receipts" />
          ) : (
            <div className="space-y-3">
              {relatedReceipts
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          receipt.status === "paid" ? "bg-green-500" : "bg-amber-500",
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium capitalize">{receipt.type}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {receipt.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={receipt.status === "paid" ? "default" : "secondary"}>
                        {receipt.status}
                      </Badge>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          receipt.status === "paid"
                            ? "text-green-500"
                            : "text-[var(--color-foreground)]",
                        )}
                      >
                        {formatCurrency(receipt.amount)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
