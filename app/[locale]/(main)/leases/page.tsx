import { Suspense } from "react";
import { LeasesView } from "@/components/features/lease";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

export default function LeasesPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <LeasesView />
    </Suspense>
  );
}
