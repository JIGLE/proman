import { Suspense } from "react";
import { CorrespondenceView } from "@/components/features/correspondence/correspondence-view";

export const dynamic = 'force-dynamic';

export default function CorrespondencePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CorrespondenceView />
    </Suspense>
  );
}
