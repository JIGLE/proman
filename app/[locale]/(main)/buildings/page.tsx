import { Suspense } from "react";
import { BuildingsView } from "@/components/features/property/buildings-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

export default function BuildingsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <BuildingsView />
    </Suspense>
  );
}
