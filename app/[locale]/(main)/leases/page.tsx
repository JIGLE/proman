import { Suspense } from "react";
import { TenantsLeasesContainer } from "@/components/features/lease/tenants-leases-container";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function LeasesPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <TenantsLeasesContainer />
    </Suspense>
  );
}
