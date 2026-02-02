import { Suspense } from "react";
import { TenantsLeasesContainer } from "@/components/features/lease/tenants-leases-container";

export const dynamic = 'force-dynamic';

export default function LeasesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TenantsLeasesContainer />
    </Suspense>
  );
}
