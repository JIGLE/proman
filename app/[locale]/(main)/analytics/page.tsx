import { Suspense } from "react";
import { InsightsView } from "@/components/features/insights/insights-view";

export const dynamic = 'force-dynamic';

export default function InsightsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InsightsView />
    </Suspense>
  );
}
