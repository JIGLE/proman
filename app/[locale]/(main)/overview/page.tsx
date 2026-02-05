import { Suspense } from "react";
import { OverviewView } from "@/components/features/dashboard/overview-view";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OverviewView />
    </Suspense>
  );
}
