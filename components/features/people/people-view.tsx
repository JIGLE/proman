"use client";

import { Users, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { TenantsView } from "@/components/features/tenant/tenants-view";
import { LeasesView } from "@/components/features/lease/leases-view";
import { ExportButton } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";

/**
 * People View - Unified view for managing tenant relationships and lease contracts
 * 
 * Information Architecture:
 * - Purpose: Manage tenant relationships and lease contracts
 * - Belongs here: Tenant directory, lease management, tenant communication history, payment status
 * - Forbidden: Property CRUD, maintenance details, expense tracking
 * - Links to: Assets (tenant's property), Maintenance (tickets), Correspondence (messages)
 */
export function PeopleView(): React.ReactElement {
  const [activeTab, setActiveTab] = useTabPersistence('people', 'tenants');
  const { state } = useApp();
  const { tenants, leases } = state;

  // Export columns for tenants
  const tenantColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'paymentStatus', label: 'Status' },
    { key: 'leaseStart', label: 'Lease Start' },
    { key: 'leaseEnd', label: 'Lease End' }
  ];

  // Export columns for leases
  const leaseColumns = [
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'monthlyRent', label: 'Monthly Rent' },
    { key: 'status', label: 'Status' }
  ];

  // Get export data based on active tab
  const exportConfig = activeTab === 'tenants' 
    ? { data: tenants, columns: tenantColumns }
    : { data: leases, columns: leaseColumns };

  return (
    <div className="space-y-6">
      {/* Page Header - Consistent with page type inventory */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            People
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage tenant relationships and lease contracts
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

      {/* Tab Navigation - Max 5 tabs per entity rule */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Tenants</span>
            <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
              {tenants.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="leases" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Leases</span>
            <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
              {leases.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-0">
          <TenantsView />
        </TabsContent>

        <TabsContent value="leases" className="mt-0">
          <LeasesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PeopleView;
