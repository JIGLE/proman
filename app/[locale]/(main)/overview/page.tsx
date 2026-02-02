import { Suspense } from "react";
import { OverviewView } from "@/components/features/dashboard/overview-view";

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OverviewView />
    </Suspense>
  );
}
