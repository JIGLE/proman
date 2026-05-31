import { Suspense } from "react";
import InsightsView from "@/components/features/insights/insights-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function InsightsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <div className="h-full">
        <InsightsView />
      </div>
    </Suspense>
  );
}
