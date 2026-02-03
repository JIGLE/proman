"use client";

import { Building2, Users2, Briefcase, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { PropertiesView } from "@/components/features/property/property-list";
import UnitsView from "@/components/features/property/units-view";
import { OwnersView } from "@/components/features/owner/owners-view";
import { ExportButton } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";

/**
 * Assets View - Unified view for managing physical properties and ownership
 * 
 * Information Architecture:
 * - Purpose: Manage physical properties and ownership
 * - Belongs here: Properties list/map/details, Units, Owners, Building-level operations
 * - Forbidden: Tenant data (except occupancy status), financial transactions, maintenance tickets
 * - Links to: People (view tenants in property), Maintenance (create ticket for property)
 * - Depth: 2 levels max (Assets → Property Detail → Unit Detail)
 */
export function AssetsView(): React.ReactElement {
  const [activeTab, setActiveTab] = useTabPersistence('assets', 'properties');
  const { state } = useApp();
  const { properties, owners } = state;

  // Export columns for properties
  const propertyColumns = [
    { key: 'name', label: 'Name' },
    { key: 'address', label: 'Address' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'bedrooms', label: 'Bedrooms' },
    { key: 'bathrooms', label: 'Bathrooms' },
    { key: 'rent', label: 'Rent' }
  ];

  const ownerColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' }
  ];

  // Get export data based on active tab
  const getExportData = () => {
    switch (activeTab) {
      case 'properties':
        return { data: properties, columns: propertyColumns };
      case 'owners':
        return { data: owners, columns: ownerColumns };
      default:
        return { data: [], columns: [] };
    }
  };

  const exportConfig = getExportData();

  return (
    <div className="space-y-6">
      {/* Page Header - Consistent with page type inventory */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Assets
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage your property portfolio and ownership structure
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

      {/* Tab Navigation - Max 5 tabs per section rule (currently 4) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Properties</span>
            <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
              {properties.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Map</span>
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            <span className="hidden sm:inline">Units</span>
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Owners</span>
            <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
              {owners.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="mt-0">
          <PropertiesView />
        </TabsContent>

        <TabsContent value="map" className="mt-0">
          {/* Map view is handled within PropertiesView tabs - 
              For now render PropertiesView with map tab active */}
          <PropertiesView />
        </TabsContent>

        <TabsContent value="units" className="mt-0">
          <UnitsView />
        </TabsContent>

        <TabsContent value="owners" className="mt-0">
          <OwnersView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssetsView;
