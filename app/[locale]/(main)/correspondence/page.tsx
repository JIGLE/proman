import { Suspense } from "react";
import { CorrespondenceView } from "@/components/features/correspondence/correspondence-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function CorrespondencePage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <CorrespondenceView />
    </Suspense>
  );
}
