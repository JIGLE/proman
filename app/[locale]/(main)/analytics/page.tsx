import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/features/dashboard/analytics-dashboard";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
