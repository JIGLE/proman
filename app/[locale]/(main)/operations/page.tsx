import { Suspense } from "react";
import { MaintenanceView } from "@/components/features/maintenance/maintenance-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

export default function OperationsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <MaintenanceView />
    </Suspense>
  );
}
