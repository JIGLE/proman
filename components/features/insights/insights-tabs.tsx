"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import InsightsView from "@/components/features/insights/insights-view";
import { AnalyticsDashboard } from "@/components/features/dashboard/analytics-dashboard";
import { ReportsView } from "@/components/features/report/reports-view";

type InsightsTab = "summary" | "analytics" | "reports";

const VALID_TABS: InsightsTab[] = ["summary", "analytics", "reports"];

/**
 * Unified "Insights" surface. Consolidates the previously separate Analytics
 * and Reports destinations (plus the executive summary) into one place with
 * tabs, removing the "which numbers page do I need?" ambiguity. The active tab
 * is reflected in the URL (?tab=) so the retired /analytics and /reports routes
 * can deep-link straight to the right panel.
 */
export function InsightsTabs(): React.ReactElement {
  const t = useTranslations("navigation");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get("tab");
  const active: InsightsTab =
    requested && (VALID_TABS as string[]).includes(requested)
      ? (requested as InsightsTab)
      : "summary";

  const handleChange = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "summary") params.delete("tab");
      else params.set("tab", value);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={active} onValueChange={handleChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="summary">{t("summary")}</TabsTrigger>
        <TabsTrigger value="analytics">{t("analytics")}</TabsTrigger>
        <TabsTrigger value="reports">{t("reports")}</TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <InsightsView />
      </TabsContent>
      <TabsContent value="analytics">
        <AnalyticsDashboard />
      </TabsContent>
      <TabsContent value="reports">
        <ReportsView />
      </TabsContent>
    </Tabs>
  );
}

export default InsightsTabs;
