"use client";

import { useTranslations } from "next-intl";
import { Lightbulb, BarChart3, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabPersistence } from "@/lib/hooks/use-tab-persistence";
import { InsightsView } from "@/components/features/insights/insights-view";
import { AnalyticsDashboard } from "@/components/features/dashboard/analytics-dashboard";
import { ReportsView } from "@/components/features/report/reports-view";

/**
 * Intelligence — consolidates the three previously-separate analytics
 * surfaces (Overview/Insights, Analytics, Reports) into one tabbed
 * container, following the FinancialsContainer/PeopleView pattern. Each
 * child view keeps its own internal state/tabs untouched -- this is a
 * routing/container consolidation, not a rebuild. Tax connector status
 * stays in Finance (where PR 10 placed TaxConnectorDashboard) rather than
 * being duplicated here.
 */
export function IntelligenceView(): React.ReactElement {
  const t = useTranslations("intelligence");
  const [activeTab, setActiveTab] = useTabPersistence("intelligence", "overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">{t("title")}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{t("subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            {t("tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t("tabs.analytics")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("tabs.reports")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <InsightsView />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <ReportsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntelligenceView;
