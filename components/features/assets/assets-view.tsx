"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Clock3,
  CreditCard,
  FileText,
  MapPin,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { PropertiesView, PropertiesViewRef } from "@/components/features/property/property-list";
import { ExportButton, ExportColumn } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { getActiveLease } from "@/lib/utils/lease-helpers";

// ─── Tenant portal stat card (unchanged, still used in tenant view) ──────────
function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="border-white/10 bg-zinc-950/70">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

// ─── Alert chip used inside the Issues Zone ───────────────────────────────────
function IssueAlert({
  icon: Icon,
  count,
  label,
  sublabel,
  color,
  onClick,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  sublabel: string;
  color: "amber" | "orange" | "blue";
  onClick: () => void;
}) {
  const styles = {
    amber: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/10 hover:bg-amber-500/15",
      icon: "text-amber-400",
      count: "text-amber-200",
      text: "text-amber-200/80",
    },
    orange: {
      border: "border-orange-500/30",
      bg: "bg-orange-500/10 hover:bg-orange-500/15",
      icon: "text-orange-400",
      count: "text-orange-200",
      text: "text-orange-200/80",
    },
    blue: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/10 hover:bg-blue-500/15",
      icon: "text-blue-400",
      count: "text-blue-200",
      text: "text-blue-200/80",
    },
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 text-left transition-colors sm:w-auto sm:flex-1`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${styles.count}`}>
          {count} {label}
        </p>
        <p className={`text-xs ${styles.text}`}>{sublabel}</p>
      </div>
      <span className={`shrink-0 text-xs font-medium ${styles.count} opacity-70`}>View →</span>
    </button>
  );
}

export function AssetsView(): React.ReactElement {
  const [activeTab, setActiveTab] = useTabPersistence("assets", "properties");
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | null>(null);
  const { state } = useApp();
  const { isOwnerPortal } = usePortalAccess();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt";
  const { properties, leases, maintenance, receipts, tenants } = state;
  const propertiesViewRef = useRef<PropertiesViewRef>(null);

  const handleLocateOnMap = (propertyId: string) => {
    setHighlightedPropertyId(propertyId);
    setActiveTab("map");
  };

  const propertyColumns: ExportColumn[] = [
    { key: "name", label: "Name" },
    { key: "address", label: "Address" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "bedrooms", label: "Bedrooms" },
    { key: "bathrooms", label: "Bathrooms" },
    { key: "rent", label: "Rent" },
  ];

  const exportConfig =
    activeTab === "properties"
      ? ({ data: properties, columns: propertyColumns } satisfies {
          data: unknown[];
          columns: ExportColumn[];
        })
      : ({ data: [], columns: [] } satisfies { data: unknown[]; columns: ExportColumn[] });

  // ── Portfolio summary metrics ────────────────────────────────────────────────
  const occupiedCount = properties.filter((p) => p.status === "occupied").length;
  const occupancyRate = properties.length
    ? Math.round((occupiedCount / properties.length) * 100)
    : 0;
  const monthlyRunRate = properties.reduce((sum, p) => sum + (p.rent || 0), 0);
  const mappedCount = properties.filter(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
  ).length;

  // ── Issue counts ─────────────────────────────────────────────────────────────
  const expiringLeasesCount = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    return leases.filter((l) => {
      if (l.status !== "active") return false;
      const end = new Date(l.endDate);
      return end >= now && end <= in30;
    }).length;
  }, [leases]);

  const openMaintenanceCount = useMemo(
    () => maintenance.filter((t) => t.status === "open" || t.status === "in_progress").length,
    [maintenance],
  );

  const missingCoordinatesCount = Math.max(properties.length - mappedCount, 0);

  // Partial setup: occupied properties with no active lease (need attention)
  const activeLeasePropertyIds = useMemo(
    () => new Set(leases.filter((l) => l.status === "active").map((l) => l.propertyId)),
    [leases],
  );
  const partialSetupCount = useMemo(
    () =>
      properties.filter((p) => p.status === "occupied" && !activeLeasePropertyIds.has(p.id)).length,
    [properties, activeLeasePropertyIds],
  );

  const hasIssues =
    expiringLeasesCount > 0 ||
    openMaintenanceCount > 0 ||
    missingCoordinatesCount > 0 ||
    partialSetupCount > 0;

  // ── Tenant portal home ───────────────────────────────────────────────────────
  const tenantHome = useMemo(() => {
    const tenant = tenants[0];
    const activeLease = tenant ? getActiveLease(tenant.id, leases) : null;
    const property = properties.find(
      (p) => p.id === (activeLease?.propertyId ?? tenant?.propertyId),
    );
    const paidReceipts = receipts.filter((r) => r.status === "paid");
    return { tenant, activeLease, property, paidReceipts };
  }, [leases, properties, receipts, tenants]);

  if (!isOwnerPortal) {
    // ── Tenant view (unchanged structure, trimmed) ─────────────────────────────
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 shadow-2xl shadow-black/20">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="w-fit border-blue-500/20 bg-blue-500/10 text-blue-200"
              >
                Portfolio
              </Badge>
              <div className="space-y-2">
                <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-zinc-50">
                  <Building2 className="h-8 w-8" />
                  {tenantHome.property?.name ?? "My home"}
                </h1>
                <p className="text-sm leading-6 text-zinc-300 sm:text-base">
                  Keep the essentials for your home in one place: lease, payments, receipts, and
                  shared documents.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(`/${locale}/financials`)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payments
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${locale}/leases`)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  My lease
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${locale}/documents`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  My documents
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                label="Monthly rent"
                value={formatCurrency(
                  tenantHome.activeLease?.monthlyRent ?? tenantHome.property?.rent ?? 0,
                )}
                detail={
                  tenantHome.activeLease
                    ? `Lease ends ${tenantHome.activeLease.endDate}`
                    : "No lease loaded"
                }
              />
              <StatCard
                label="Receipts"
                value={`${tenantHome.paidReceipts.length}`}
                detail="Paid records available"
              />
              <Card className="border-white/10 bg-zinc-950/70 md:col-span-2">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-300" />
                        <p className="font-medium text-zinc-50">Home summary</p>
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {tenantHome.property?.address ?? "Property address not available"}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {tenantHome.property?.status ?? "active"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                    <Sparkles className="h-4 w-4 text-blue-300" />
                    {tenantHome.property?.latitude && tenantHome.property?.longitude
                      ? "Map view is available for your home."
                      : "Map view will appear once coordinates are available."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Home details</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="mt-0">
            <PropertiesView
              ref={propertiesViewRef}
              viewMode="map"
              density="compact"
              showPageHeader={false}
              highlightedPropertyId={highlightedPropertyId ?? undefined}
            />
          </TabsContent>
          <TabsContent value="properties" className="mt-0">
            <PropertiesView
              ref={propertiesViewRef}
              viewMode="list"
              density="compact"
              showPageHeader={false}
              onLocateOnMap={handleLocateOnMap}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Owner portal view (refactored) ────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Zone 1: Primary Action ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-50">
            <Building2 className="h-6 w-6 shrink-0" />
            Portfolio
          </h1>
          {properties.length > 0 ? (
            <p className="mt-0.5 text-sm text-zinc-500">
              {properties.length} unit{properties.length !== 1 ? "s" : ""} &middot; {occupancyRate}%
              occupied &middot; {formatCurrency(monthlyRunRate)}/mo run rate
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-zinc-500">No properties yet — add your first one.</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {partialSetupCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => propertiesViewRef.current?.openDialog()}
              className="gap-1.5 border-amber-500/40 text-amber-300 hover:border-amber-400/60 hover:text-amber-200"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Continue Setup
            </Button>
          )}
          <Button onClick={() => propertiesViewRef.current?.openDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
          <ExportButton
            data={exportConfig.data}
            filename={`${activeTab}-export`}
            columns={exportConfig.columns}
          />
        </div>
      </div>

      {/* ── Zone 2: Issues / Attention ───────────────────────────────────────── */}
      {hasIssues && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Needs attention
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {expiringLeasesCount > 0 && (
              <IssueAlert
                icon={Clock3}
                count={expiringLeasesCount}
                label={expiringLeasesCount === 1 ? "lease expiring" : "leases expiring"}
                sublabel="Active lease ends within 30 days"
                color="amber"
                onClick={() => router.push(`/${locale}/leases`)}
              />
            )}
            {openMaintenanceCount > 0 && (
              <IssueAlert
                icon={Wrench}
                count={openMaintenanceCount}
                label={openMaintenanceCount === 1 ? "open ticket" : "open tickets"}
                sublabel="Maintenance requests awaiting action"
                color="orange"
                onClick={() => router.push(`/${locale}/maintenance`)}
              />
            )}
            {partialSetupCount > 0 && (
              <IssueAlert
                icon={AlertTriangle}
                count={partialSetupCount}
                label={partialSetupCount === 1 ? "property incomplete" : "properties incomplete"}
                sublabel="Occupied with no active lease on file"
                color="amber"
                onClick={() => setActiveTab("properties")}
              />
            )}
            {missingCoordinatesCount > 0 && (
              <IssueAlert
                icon={MapPin}
                count={missingCoordinatesCount}
                label={missingCoordinatesCount === 1 ? "missing location" : "missing locations"}
                sublabel="Address not mapped — fix to enable map view"
                color="blue"
                onClick={() => setActiveTab("map")}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Zone 3: Management (Filters + Table) ────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center gap-2">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="mt-0">
          <PropertiesView
            ref={propertiesViewRef}
            viewMode="map"
            density="compact"
            showPageHeader={false}
            highlightedPropertyId={highlightedPropertyId ?? undefined}
          />
        </TabsContent>

        <TabsContent value="properties" className="mt-0">
          <PropertiesView
            ref={propertiesViewRef}
            viewMode="list"
            density="compact"
            showPageHeader={false}
            onLocateOnMap={handleLocateOnMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssetsView;
