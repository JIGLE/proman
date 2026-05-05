"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Edit,
  ArrowLeft,
  FileText,
  Wrench,
  DollarSign,
  Link2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useCsrf } from "@/lib/contexts/csrf-context";
import { useToast } from "@/lib/contexts/toast-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/contexts/app-context";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { EntityLink } from "@/components/shared/entity-link";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";
import { getActiveLease as findActiveLease } from "@/lib/utils/lease-helpers";
import { buildLocalizedFinancialReviewPath } from "@/lib/utils/financial-navigation";
import { TenantDetailModal } from "@/components/features/tenant/tenant-detail-modal";

interface TenantDetailViewProps {
  tenantId: string;
}

const PAYMENT_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
};

export function TenantDetailView({ tenantId }: TenantDetailViewProps) {
  const { state } = useApp();
  const { formatCurrency } = useCurrency();
  const { token: csrfToken } = useCsrf();
  const { success, error } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "pt";
  const [activeTab, setActiveTab] = useTabPersistence("tenant-detail", "overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const tenant = state.tenants.find((t) => t.id === tenantId);

  // Related entities
  const relatedLeases = useMemo(
    () => state.leases.filter((l) => l.tenantId === tenantId),
    [state.leases, tenantId],
  );
  const relatedReceipts = useMemo(
    () => state.receipts.filter((r) => r.tenantId === tenantId),
    [state.receipts, tenantId],
  );
  const relatedMaintenance = useMemo(
    () => state.maintenance.filter((m) => m.tenantId === tenantId),
    [state.maintenance, tenantId],
  );
  const relatedCorrespondence = useMemo(
    () => state.correspondence.filter((c) => c.tenantId === tenantId),
    [state.correspondence, tenantId],
  );

  // Find tenant's property
  const property = tenant?.propertyId
    ? state.properties.find((p) => p.id === tenant.propertyId)
    : null;

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[var(--color-muted-foreground)]">Tenant not found</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/people`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
      </div>
    );
  }

  // Derive lease data from active lease instead of redundant tenant fields
  const activeLease = findActiveLease(tenantId, state.leases);
  const totalPaid = relatedReceipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);
  const openTickets = relatedMaintenance.filter(
    (m) => m.status === "open" || m.status === "in_progress",
  ).length;

  const handleCopyPortalLink = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/portal-link`, {
        headers: { "x-csrf-token": csrfToken ?? "" },
      });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      await navigator.clipboard.writeText(data.portalUrl);
      success("Portal link copied to clipboard");
    } catch {
      error("Could not generate portal link");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10">
            <Users className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{tenant.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 text-sm text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {tenant.email}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {tenant.phone}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={PAYMENT_STATUS_VARIANT[tenant.paymentStatus] || "secondary"}>
                {tenant.paymentStatus}
              </Badge>
              {/* Derived from active lease's monthlyRent */}
              <span className="text-sm font-medium">
                {formatCurrency(activeLease?.monthlyRent ?? tenant.rent)}/mo
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(buildLocalizedFinancialReviewPath(locale, { tenantId: tenant.id }))
            }
          >
            <DollarSign className="h-4 w-4 mr-1" /> Review Payments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/${locale}/documents?search=${encodeURIComponent(tenant.name)}`)
            }
          >
            <FileText className="h-4 w-4 mr-1" /> Documents
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyPortalLink}>
            <Link2 className="h-4 w-4 mr-1" /> Portal Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = `mailto:${tenant.email}`;
            }}
          >
            <Mail className="h-4 w-4 mr-1" /> Contact
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        </div>
      </div>

      {/* Relationship Cards */}
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
        {activeLease && (
          <EntityLink
            type="lease"
            id={activeLease.id}
            title={`Active Lease`}
            subtitle={`${formatCurrency(activeLease.monthlyRent)}/mo · Ends ${activeLease.endDate}`}
            status={activeLease.status}
            statusVariant="success"
            variant="full"
          />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lease" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Lease
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Payments
            {relatedReceipts.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {relatedReceipts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Maintenance
            {openTickets > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/20 text-amber-500 px-2 py-0.5 text-xs">
                {openTickets}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Messages
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Monthly Rent</div>
                {/* Derived from active lease's monthlyRent */}
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(activeLease?.monthlyRent ?? tenant.rent)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Total Paid</div>
                <div className="text-2xl font-bold text-green-500 mt-1">
                  {formatCurrency(totalPaid)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Lease Period</div>
                {/* Derived from active lease's startDate/endDate */}
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="text-sm font-medium">
                    {activeLease?.startDate ?? tenant.leaseStart} —{" "}
                    {activeLease?.endDate ?? tenant.leaseEnd}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Open Tickets</div>
                <div className="text-2xl font-bold text-amber-500 mt-1">{openTickets}</div>
              </CardContent>
            </Card>
          </div>

          {tenant.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-muted-foreground)]">{tenant.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lease Tab */}
        <TabsContent value="lease">
          {relatedLeases.length === 0 ? (
            <EmptyStateIllustration entityType="leases" />
          ) : (
            <div className="grid gap-3">
              {relatedLeases.map((lease) => (
                <EntityLink
                  key={lease.id}
                  type="lease"
                  id={lease.id}
                  title={`Lease ${lease.id.slice(0, 8)}`}
                  subtitle={`${formatCurrency(lease.monthlyRent)}/mo · ${lease.startDate} — ${lease.endDate} · Deposit: ${formatCurrency(lease.deposit)}`}
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
              ))}
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          {relatedReceipts.length === 0 ? (
            <EmptyStateIllustration entityType="receipts" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedReceipts
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">{receipt.type}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {receipt.date}
                          </p>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          {relatedMaintenance.length === 0 ? (
            <EmptyStateIllustration entityType="maintenance" />
          ) : (
            <div className="space-y-3">
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

        {/* Messages Tab */}
        <TabsContent value="messages">
          {relatedCorrespondence.length === 0 ? (
            <EmptyStateIllustration entityType="correspondence" />
          ) : (
            <div className="space-y-3">
              {relatedCorrespondence.map((msg) => (
                <Card key={msg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{msg.subject}</p>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1 line-clamp-2">
                          {msg.content}
                        </p>
                      </div>
                      <Badge
                        variant={
                          msg.status === "sent" || msg.status === "delivered"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {msg.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TenantDetailModal
        tenant={tenant}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
