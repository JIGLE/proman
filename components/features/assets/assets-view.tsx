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
import { BuildingsView } from "@/components/features/property/buildings-view";
import { ExportButton, ExportColumn } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { getActiveLease } from "@/lib/utils/lease-helpers";

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

  const propertyColumns = [
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

  const occupiedCount = properties.filter((property) => property.status === "occupied").length;
  const occupancyRate = properties.length
    ? Math.round((occupiedCount / properties.length) * 100)
    : 0;
  const monthlyRunRate = properties.reduce((sum, property) => sum + (property.rent || 0), 0);
  const mappedCount = properties.filter(
    (property) => typeof property.latitude === "number" && typeof property.longitude === "number",
  ).length;
  const expiringLeasesCount = useMemo(() => {
    const now = new Date();
    const inThirtyDays = new Date();
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);

    return leases.filter((lease) => {
      if (lease.status !== "active") return false;
      const endDate = new Date(lease.endDate);
      return endDate >= now && endDate <= inThirtyDays;
    }).length;
  }, [leases]);
  const openMaintenanceCount = useMemo(
    () =>
      maintenance.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress")
        .length,
    [maintenance],
  );
  const missingCoordinatesCount = Math.max(properties.length - mappedCount, 0);

  const tenantHome = useMemo(() => {
    const tenant = tenants[0];
    const activeLease = tenant ? getActiveLease(tenant.id, leases) : null;
    const property = properties.find(
      (item) => item.id === (activeLease?.propertyId ?? tenant?.propertyId),
    );
    const paidReceipts = receipts.filter((receipt) => receipt.status === "paid");

    return { tenant, activeLease, property, paidReceipts };
  }, [leases, properties, receipts, tenants]);

  return (
    <div className="space-y-6">
      {isOwnerPortal ? (
        <>
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <Badge
                  variant="outline"
                  className="w-fit border-blue-500/20 bg-blue-500/10 text-blue-200"
                >
                  Portfolio workspace
                </Badge>
                <div className="space-y-2">
                  <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-zinc-50">
                    <Building2 className="h-8 w-8" />
                    Portfolio
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                    Manage portfolio health, occupancy, and rent potential without burying the main
                    list under too many competing cards.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => propertiesViewRef.current?.openDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Property
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("map")} className="gap-2">
                    <MapPin className="h-4 w-4" />
                    Open map
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 xl:w-[520px]">
                <StatCard
                  label="Tracked units"
                  value={`${properties.length}`}
                  detail={`${occupiedCount} occupied`}
                />
                <StatCard
                  label="Occupancy"
                  value={`${occupancyRate}%`}
                  detail={`${Math.max(properties.length - occupiedCount, 0)} vacancy slots`}
                />
                <StatCard
                  label="Run rate"
                  value={formatCurrency(monthlyRunRate)}
                  detail={`${mappedCount}/${properties.length || 0} on map`}
                />
              </div>
            </div>
          </section>

          {/* Slim attention strip */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Attention
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("properties")}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:border-amber-400/60"
            >
              <Clock3 className="h-3.5 w-3.5" />
              <span className="font-semibold text-zinc-50">{expiringLeasesCount}</span>
              leases ending 30d
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/maintenance`)}
              className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-200 transition-colors hover:border-orange-400/60"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="font-semibold text-zinc-50">{openMaintenanceCount}</span>
              open tickets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200 transition-colors hover:border-blue-400/60"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-semibold text-zinc-50">{missingCoordinatesCount}</span>
              missing coords
            </button>
            <div className="ml-auto">
              <ExportButton
                data={exportConfig.data}
                filename={`${activeTab}-export`}
                columns={exportConfig.columns}
              />
            </div>
          </div>
        </>
      ) : (
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
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center gap-2">
          <TabsList
            className={`grid w-full ${isOwnerPortal ? "max-w-lg grid-cols-3" : "max-w-md grid-cols-2"}`}
          >
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isOwnerPortal ? "Portfolio list" : "Home details"}
              </span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            {isOwnerPortal && (
              <TabsTrigger value="buildings" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Buildings</span>
              </TabsTrigger>
            )}
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

        {isOwnerPortal && (
          <TabsContent value="buildings" className="mt-0">
            <BuildingsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default AssetsView;
