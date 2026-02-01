import { Suspense } from "react";
import { OverviewView } from "@/components/features/dashboard/overview-view";

export default function OverviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OverviewView />
    </Suspense>
  );
}
