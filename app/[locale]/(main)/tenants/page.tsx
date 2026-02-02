import { Suspense } from "react";
import { TenantsView } from "@/components/features/tenant/tenants-view";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading tenants…</div>}>
      <div className="h-full">
        <TenantsView />
      </div>
    </Suspense>
  );
}
