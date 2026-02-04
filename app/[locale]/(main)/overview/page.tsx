import { Suspense } from "react";
import { OverviewView } from "@/components/features/dashboard/overview-view";

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  return (
    <Suspense fallback={
      <div role="status" aria-live="polite" className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" aria-hidden="true"></div>
          <p className="text-zinc-400">Loading overview...</p>
          <span className="sr-only">Loading dashboard data</span>
        </div>
      </div>
    }>
      <OverviewView />
    </Suspense>
  );
}
