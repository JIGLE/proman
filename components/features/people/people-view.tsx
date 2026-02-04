"use client";

import { Users, Briefcase, Plus } from "lucide-react";
import { useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { TenantsView, TenantsViewRef } from "@/components/features/tenant/tenants-view";
import { OwnersView, OwnersViewRef } from "@/components/features/owner/owners-view";
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
  const [activeTab, setActiveTab] = useTabPersistence('people', 'tenants');
  const { state } = useApp();
  const { tenants, owners } = state;
  const tenantsViewRef = useRef<TenantsViewRef>(null);
  const ownersViewRef = useRef<OwnersViewRef>(null);

  // Export columns for tenants
  const tenantColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'paymentStatus', label: 'Status' },
    { key: 'leaseStart', label: 'Lease Start' },
    { key: 'leaseEnd', label: 'Lease End' }
  ];

  // Export columns for owners
  const ownerColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' }
  ];

  // Get export data based on active tab
  const exportConfig = activeTab === 'tenants' 
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
              People Directory
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Manage tenants and property owners
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Tenants</div>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {tenants.length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Tenants</div>
            <div className="text-2xl font-bold text-green-500">
              {tenants.filter(t => t.status === 'active').length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Owners</div>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {owners.length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Owners</div>
            <div className="text-2xl font-bold text-blue-500">
              {owners.filter(o => o.status === 'active').length}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Tenants and Owners */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center gap-2">
          <TabsList className="grid w-full max-w-md grid-cols-2">
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
          </TabsList>
          {activeTab === 'tenants' && (
            <Button 
              onClick={() => tenantsViewRef.current?.openDialog()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Tenant</span>
            </Button>
          )}
          {activeTab === 'owners' && (
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
          <TenantsView ref={tenantsViewRef} />
        </TabsContent>

        <TabsContent value="owners" className="mt-0">
          <OwnersView ref={ownersViewRef} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PeopleView;
