"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, Briefcase, Plus, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { TenantsView, TenantsViewRef } from "@/components/features/tenant/tenants-view";
import { OwnersView, OwnersViewRef } from "@/components/features/owner/owners-view";
import { ContactsView } from "@/components/features/contacts/contacts-view";
import { ExportButton } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";

/**
 * People View - Unified view for managing all people: tenants and owners
 *
 * Information Architecture:
 * - Purpose: Manage tenant and owner relationships
 * - Belongs here: Tenant directory, Owner directory, communication history, payment status
 * - Moved to Contracts: Leases (now under Operations > Contracts)
 * - Moved to Maintenance > Contacts: Maintenance contacts (contractors, vendors)
 * - Forbidden: Property CRUD, maintenance details, expense tracking
 * - Links to: Assets (tenant's/owner's property), Maintenance (tickets), Correspondence (messages)
 */
export function PeopleView(): React.ReactElement {
  const [activeTab, setActiveTab] = useTabPersistence("people", "tenants");
  const searchParams = useSearchParams();
  const { state } = useApp();
  const { tenants, owners } = state;
  const tenantsViewRef = useRef<TenantsViewRef>(null);
  const ownersViewRef = useRef<OwnersViewRef>(null);
  const t = useTranslations("people");

  useEffect(() => {
    const view = searchParams.get("view");
    if ((view === "owners" || view === "contacts" || view === "tenants") && view !== activeTab) {
      setActiveTab(view);
    }
  }, [activeTab, searchParams, setActiveTab]);

  // Export columns for tenants
  const tenantColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "paymentStatus", label: "Status" },
    { key: "leaseStart", label: "Lease Start" },
    { key: "leaseEnd", label: "Lease End" },
  ];

  // Export columns for owners
  const ownerColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
  ];

  // Get export data based on active tab
  const exportConfig =
    activeTab === "tenants"
      ? { data: tenants, columns: tenantColumns }
      : { data: owners, columns: ownerColumns };

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between gap-4">
          {/* The bottom nav already labels this screen — hide the repeated
              title/subtitle on mobile so content starts higher. */}
          <div className="hidden sm:block">
            <h1 className="text-3xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Users className="h-8 w-8" />
              {t("title")}
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{t("subtitle")}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ExportButton
              data={exportConfig.data}
              filename={`${activeTab}-export`}
              columns={exportConfig.columns}
            />
          </div>
        </div>

        {/* People Statistics — 3-up on every width so the grid stays symmetric */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-solid)] p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mb-1">
              {t("totalTenants")}
            </div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
              {tenants.length}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-solid)] p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mb-1">
              {t("activeTenants")}
            </div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--color-success)]">
              {tenants.filter((tenant) => new Date(tenant.leaseEnd) > new Date()).length}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-solid)] p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mb-1">
              {t("totalOwners")}
            </div>
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
              {owners.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Tenants and Owners */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center gap-2">
          {/* Scrollable on narrow screens so no tab label ever clips. */}
          <TabsList className="flex w-full max-w-lg justify-start overflow-x-auto sm:grid sm:grid-cols-3">
            <TabsTrigger value="tenants" className="flex shrink-0 items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>{t("tenants")}</span>
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs tabular-nums">
                {tenants.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex shrink-0 items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span>{t("owners")}</span>
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs tabular-nums">
                {owners.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap"
            >
              <Wrench className="h-4 w-4 shrink-0" />
              <span>{t("serviceProviders")}</span>
            </TabsTrigger>
          </TabsList>
          {activeTab === "tenants" && (
            <Button
              onClick={() => tenantsViewRef.current?.openDialog()}
              className="flex shrink-0 items-center gap-2"
              aria-label={t("addTenant")}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("addTenant")}</span>
            </Button>
          )}
          {activeTab === "owners" && (
            <Button
              onClick={() => ownersViewRef.current?.openDialog()}
              className="flex shrink-0 items-center gap-2"
              aria-label={t("addOwner")}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("addOwner")}</span>
            </Button>
          )}
        </div>

        <TabsContent value="tenants" className="mt-0">
          <TenantsView ref={tenantsViewRef} density="compact" />
        </TabsContent>

        <TabsContent value="owners" className="mt-0">
          <OwnersView ref={ownersViewRef} density="compact" />
        </TabsContent>

        <TabsContent value="contacts" className="mt-0">
          <ContactsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PeopleView;
