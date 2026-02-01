import { Suspense } from "react";
import { CorrespondenceView } from "@/components/features/correspondence/correspondence-view";

export default function CorrespondencePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CorrespondenceView />
    </Suspense>
  );
}
