"use client";

import { BarChart3, FileBarChart, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { AnalyticsDashboard } from "@/components/features/dashboard/analytics-dashboard";
import { ReportsView } from "@/components/features/report/reports-view";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";

/**
 * Insights View - Unified view for portfolio performance analysis and reporting
 * 
 * Information Architecture:
 * - Purpose: Portfolio performance analysis and reporting
 * - Belongs here: Dashboards (financial, operational, occupancy), Reports, Trends, Export functions
 * - Forbidden: Data entry, CRUD operations, transactional actions
 * - Links to: All sections (via drill-down from charts/tables)
 * - Depth: 2 levels (Insights → Detailed Report/Dashboard)
 */
export function InsightsView(): React.ReactElement {
  const [activeTab, setActiveTab] = useTabPersistence('insights', 'analytics');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header - Consistent with page type inventory */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Insights
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Comprehensive portfolio analytics and reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation - Analytics vs Reports distinction */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-0" key={`analytics-${refreshKey}`}>
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="reports" className="mt-0" key={`reports-${refreshKey}`}>
          <ReportsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default InsightsView;
