import { Suspense } from "react";
import { MaintenanceView } from "@/components/features/maintenance/maintenance-view";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MaintenanceView />
    </Suspense>
  );
}
