import { Suspense } from "react";
import { AssetsView } from "@/components/features/assets/assets-view";
import { PropertiesListSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AssetsPage() {
  return (
    <Suspense fallback={<PropertiesListSkeleton />}>
      <div className="h-full">
        <AssetsView />
      </div>
    </Suspense>
  );
}
