"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Users className="h-8 w-8" />
              People
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Manage tenants, property owners, and service providers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              data={exportConfig.data}
              filename={`${activeTab}-export`}
              columns={exportConfig.columns}
            />
          </div>
        </div>

        {/* People Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Tenants</div>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {tenants.length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Tenants</div>
            <div className="text-2xl font-bold text-green-500">
              {tenants.filter((t) => new Date(t.leaseEnd) > new Date()).length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Owners</div>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">{owners.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Tenants and Owners */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center gap-2">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Tenants</span>
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {tenants.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>Owners</span>
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {owners.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span>Service Providers</span>
            </TabsTrigger>
          </TabsList>
          {activeTab === "tenants" && (
            <Button
              onClick={() => tenantsViewRef.current?.openDialog()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Tenant</span>
            </Button>
          )}
          {activeTab === "owners" && (
            <Button
              onClick={() => ownersViewRef.current?.openDialog()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Owner</span>
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
