import { Suspense } from "react";
import { ReportsView } from "@/components/features/report/reports-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <ReportsView />
    </Suspense>
  );
}
