import { Suspense } from "react";
import { ReportsView } from "@/components/features/report/reports-view";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsView />
    </Suspense>
  );
}
