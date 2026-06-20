import { Suspense } from "react";
import InsightsTabs from "@/components/features/insights/insights-tabs";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function InsightsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <div className="h-full">
        <InsightsTabs />
      </div>
    </Suspense>
  );
}
