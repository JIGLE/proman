import { Suspense } from "react";
import { OwnersView } from "@/components/features/owner/owners-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function OwnersPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <OwnersView />
    </Suspense>
  );
}
