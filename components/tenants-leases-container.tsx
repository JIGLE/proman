"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { TenantsView } from "./tenants-view";
import { LeasesView } from "./leases-view";

export function TenantsLeasesContainer() {
  const [activeTab, setActiveTab] = useTabPersistence('tenants', 'tenants');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <TenantsView />
        </TabsContent>

        <TabsContent value="leases">
          <LeasesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
