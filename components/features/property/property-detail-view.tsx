"use client";

import { useMemo } from "react";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Edit,
  Trash2,
  ArrowLeft,
  Users,
  FileText,
  Wrench,
  DollarSign,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { useCurrency } from "@/lib/contexts/currency-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/contexts/app-context";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { EntityLink } from "@/components/shared/entity-link";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustrations";

interface PropertyDetailViewProps {
  propertyId: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  occupied: "default",
  vacant: "secondary",
  maintenance: "destructive",
};

export function PropertyDetailView({ propertyId }: PropertyDetailViewProps) {
  const { state } = useApp();
  const { formatCurrency } = useCurrency();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "pt";
  const [activeTab, setActiveTab] = useTabPersistence("property-detail", "overview");

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

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[var(--color-muted-foreground)]">Property not found</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/properties`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
      </div>
    );
  }

  const totalRevenue = relatedReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = relatedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const openTickets = relatedMaintenance.filter(
    (m) => m.status === "open" || m.status === "in_progress",
  ).length;
  const activeLeases = relatedLeases.filter((l) => l.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{property.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-muted-foreground)]">
                <MapPin className="h-4 w-4" />
                <span>{property.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={STATUS_VARIANT[property.status] || "secondary"}>
                  {property.status}
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">Tenants</div>
              <div className="text-2xl font-bold mt-1">{relatedTenants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">Active Leases</div>
              <div className="text-2xl font-bold text-green-500 mt-1">{activeLeases}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">Revenue</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-[var(--color-muted-foreground)]">Open Tickets</div>
              <div className="text-2xl font-bold text-amber-500 mt-1">{openTickets}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Tenants
            {relatedTenants.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {relatedTenants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leases" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Leases
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
          <TabsTrigger value="finance" className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Finance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Property Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">Type</span>
                    <p className="font-medium capitalize">{property.type}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">Monthly Rent</span>
                    <p className="font-medium">{formatCurrency(property.rent)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">Bedrooms</span>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted-foreground)]">Bathrooms</span>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                  {property.description && (
                    <div className="col-span-2">
                      <span className="text-[var(--color-muted-foreground)]">Description</span>
                      <p className="font-medium">{property.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Entities */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Related
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
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    No related entities
                  </p>
                )}
            </div>
          </div>
        </TabsContent>

        {/* Tenants Tab */}
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
              {relatedLeases.map((lease) => (
                <EntityLink
                  key={lease.id}
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
              ))}
            </div>
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

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Total Revenue</div>
                <div className="text-2xl font-bold text-green-500 mt-1">
                  {formatCurrency(totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Total Expenses</div>
                <div className="text-2xl font-bold text-red-500 mt-1">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-[var(--color-muted-foreground)]">Net Income</div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(totalRevenue - totalExpenses)}
                </div>
              </CardContent>
            </Card>
          </div>

          {relatedReceipts.length === 0 && relatedExpenses.length === 0 ? (
            <EmptyStateIllustration entityType="receipts" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
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
                            tx.txType === "receipt" ? "text-green-500" : "text-red-500",
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
