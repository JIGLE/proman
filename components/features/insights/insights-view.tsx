"use client";

import { BarChart3, FileBarChart, RefreshCw, TrendingUp, Eye, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const handleExportData = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Exporting insights data...');
  }, []);

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Eye className="h-8 w-8" />
              Portfolio Insights
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Real-time analytics and performance metrics for data-driven decisions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <Card className="bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border-blue-800/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-foreground)]">Live</div>
                <div className="text-xs text-muted-foreground mt-1">Data Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">Active</div>
                <div className="text-xs text-muted-foreground mt-1">Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500 flex items-center justify-center gap-1">
                  <TrendingUp className="h-5 w-5" />
                  Updated
                </div>
                <div className="text-xs text-muted-foreground mt-1">Just Now</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">Full</div>
                <div className="text-xs text-muted-foreground mt-1">Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation - Enhanced with descriptions */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-2 h-auto p-1">
          <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="font-semibold">Analytics</span>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">Interactive dashboards</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex flex-col items-center gap-1 py-3">
            <div className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              <span className="font-semibold">Reports</span>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">Detailed exports</span>
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
