import { Suspense } from "react";

import { AdminMetricsView } from "@/components/features/admin/admin-metrics-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

/** Admin › Metrics. Portfolio and instance, in two blocks that never share a row. */
export default function AdminMetricsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <AdminMetricsView />
    </Suspense>
  );
}
