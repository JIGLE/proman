"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  CreditCard,
  FileText,
  MapPin,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
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

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-300">
      {count}
    </span>
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
  const { properties, leases, receipts, tenants } = state;
  const propertiesViewRef = useRef<PropertiesViewRef>(null);
  const t = useTranslations("portfolio");

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
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Building2 className="h-7 w-7 shrink-0 text-zinc-400" />
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{t("title")}</h1>
              <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-200">
                {t("badge")}
              </Badge>
              <div className="flex flex-wrap gap-2 xl:ml-4">
                <Button onClick={() => propertiesViewRef.current?.openDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addProperty")}
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("map")} className="gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("openMap")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 xl:w-[480px]">
              <StatCard
                label={t("stats.trackedUnits")}
                value={`${properties.length}`}
                detail={t("stats.occupied", { count: occupiedCount })}
              />
              <StatCard
                label={t("stats.occupancy")}
                value={`${occupancyRate}%`}
                detail={t("stats.vacancySlots", {
                  count: Math.max(properties.length - occupiedCount, 0),
                })}
              />
              <StatCard
                label={t("stats.runRate")}
                value={formatCurrency(monthlyRunRate)}
                detail={t("stats.onMap", { mapped: mappedCount, total: properties.length || 0 })}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-6 shadow-2xl shadow-black/20">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="w-fit border-blue-500/20 bg-blue-500/10 text-blue-200"
              >
                {t("tenant.badge")}
              </Badge>
              <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-zinc-50">
                <Building2 className="h-8 w-8" />
                {tenantHome.property?.name ?? t("tenant.myHome")}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(`/${locale}/financials`)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("tenant.payments")}
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${locale}/leases`)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  {t("tenant.myLease")}
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${locale}/documents`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t("tenant.myDocuments")}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                label={t("tenant.monthlyRent")}
                value={formatCurrency(
                  tenantHome.activeLease?.monthlyRent ?? tenantHome.property?.rent ?? 0,
                )}
                detail={
                  tenantHome.activeLease
                    ? t("tenant.leaseEnds", { date: tenantHome.activeLease.endDate })
                    : t("tenant.noLease")
                }
              />
              <StatCard
                label={t("tenant.receipts")}
                value={`${tenantHome.paidReceipts.length}`}
                detail={t("tenant.paidRecords")}
              />
              <Card className="border-white/10 bg-zinc-950/70 md:col-span-2">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-300" />
                        <p className="font-medium text-zinc-50">{t("tenant.homeSummary")}</p>
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {tenantHome.property?.address ?? t("tenant.addressUnavailable")}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {tenantHome.property?.status ?? "active"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                    <Sparkles className="h-4 w-4 text-blue-300" />
                    {tenantHome.property?.latitude && tenantHome.property?.longitude
                      ? t("tenant.mapAvailable")
                      : t("tenant.mapUnavailable")}
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
                {isOwnerPortal ? t("tabs.portfolioList") : t("tabs.homeDetails")}
              </span>
              {isOwnerPortal && <TabBadge count={expiringLeasesCount} />}
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabs.map")}</span>
              {isOwnerPortal && <TabBadge count={missingCoordinatesCount} />}
            </TabsTrigger>
            {isOwnerPortal && (
              <TabsTrigger value="buildings" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("tabs.buildings")}</span>
              </TabsTrigger>
            )}
          </TabsList>
          <ExportButton
            data={exportConfig.data}
            filename={`${activeTab}-export`}
            columns={exportConfig.columns}
          />
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
