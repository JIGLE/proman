import { Suspense } from "react";
import { MaintenanceView } from "@/components/features/maintenance/maintenance-view";

export const dynamic = 'force-dynamic';

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MaintenanceView />
    </Suspense>
  );
}
