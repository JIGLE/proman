import { Suspense } from "react";
import { AssetsView } from "@/components/features/assets/assets-view";
import { PropertiesListSkeleton } from "@/components/ui/page-skeletons";
import PropertyDetailRouteClient from "@/components/features/property/property-detail-route-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PropertiesListSkeleton />}>
      <div className="h-full">
        <AssetsView />
      </div>
      <PropertyDetailRouteClient />
    </Suspense>
  );
}
