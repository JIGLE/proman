"use client";

import { Building2, Users2, MapPin, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { PropertiesView } from "@/components/features/property/property-list";
import UnitsView from "@/components/features/property/units-view";
import { ExportButton, ExportColumn } from "@/components/ui/export-button";
import { useApp } from "@/lib/contexts/app-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/**
 * Assets View - Unified view for managing physical properties
 * 
 * Information Architecture:
 * - Purpose: Manage physical properties (buildings and units)
 * - Belongs here: Properties list/details, Units
 * - Forbidden: Tenant data (except occupancy status), financial transactions, maintenance tickets
 * - Moved to People: Owners (for better People consolidation)
 * - Links to: People (view tenants/owners), Maintenance (create ticket for property)
 * - Depth: 2 levels max (Assets → Property Detail → Unit Detail)
 */
export function AssetsView(): React.ReactElement {
  const [activeTab, setActiveTab] = useTabPersistence('assets', 'map');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>();
  const { state } = useApp();
  const { properties } = state;

  // Handle property selection - navigate to Units tab and set filter
  const handlePropertySelect = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setActiveTab('units');
  };

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

  // Get export data based on active tab
  const getExportData = (): { data: unknown[]; columns: ExportColumn[] } => {
    switch (activeTab) {
      case 'properties':
        return { data: properties, columns: propertyColumns };
      default:
        return { data: [], columns: [] };
    }
  };

  const exportConfig = getExportData();

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Asset Portfolio
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Manage and visualize your property portfolio
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
        
        {/* Portfolio Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Properties</div>
            <div className="text-2xl font-bold text-[var(--color-foreground)]">
              {properties.length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Occupied</div>
            <div className="text-2xl font-bold text-green-500">
              {properties.filter(p => p.status === 'occupied').length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Vacant</div>
            <div className="text-2xl font-bold text-amber-500">
              {properties.filter(p => p.status === 'vacant').length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Occupancy Rate</div>
            <div className="text-2xl font-bold text-blue-500">
              {properties.length > 0 
                ? Math.round((properties.filter(p => p.status === 'occupied').length / properties.length) * 100)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Map as default, then Properties and Units */}
      <div className="flex items-center gap-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
              <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                {properties.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              <span className="hidden sm:inline">Units</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {activeTab === 'units' && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Unit</span>
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsContent value="map" className="mt-0">
          <PropertiesView viewMode="map" onPropertySelect={handlePropertySelect} />
        </TabsContent>

        <TabsContent value="properties" className="mt-0">
          <PropertiesView viewMode="list" onPropertySelect={handlePropertySelect} />
        </TabsContent>

        <TabsContent value="units" className="mt-0">
          <UnitsView propertyId={selectedPropertyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssetsView;
