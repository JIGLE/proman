import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/features/dashboard/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
