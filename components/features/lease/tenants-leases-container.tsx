"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { TenantsView } from "@/components/features/tenant/tenants-view";
import { LeasesView } from "./leases-view";
import { usePortalAccess } from "@/lib/contexts/portal-context";

export function TenantsLeasesContainer() {
  const { isOwnerPortal } = usePortalAccess();
  const [activeTab, setActiveTab] = useTabPersistence(
    "tenants",
    isOwnerPortal ? "tenants" : "leases",
  );

  useEffect(() => {
    if (!isOwnerPortal && activeTab !== "leases") {
      setActiveTab("leases");
    }
  }, [activeTab, isOwnerPortal, setActiveTab]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          {isOwnerPortal && <TabsTrigger value="tenants">Tenants</TabsTrigger>}
          <TabsTrigger value="leases">Leases</TabsTrigger>
        </TabsList>

        {isOwnerPortal && (
          <TabsContent value="tenants">
            <TenantsView />
          </TabsContent>
        )}

        <TabsContent value="leases">
          <LeasesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
