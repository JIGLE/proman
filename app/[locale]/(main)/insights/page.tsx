import { Suspense } from "react";
import InsightsView from "@/components/features/insights/insights-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading insights...</div>}>
      <div className="h-full">
        <InsightsView />
      </div>
    </Suspense>
  );
}
