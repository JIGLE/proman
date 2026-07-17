import { Suspense } from "react";
import { IntelligenceView } from "@/components/features/intelligence/intelligence-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function IntelligencePage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <IntelligenceView />
    </Suspense>
  );
}
