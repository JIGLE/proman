import { Suspense } from "react";

import { SystemStatusView } from "@/components/features/admin/system-status-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

/**
 * Admin › System status.
 *
 * Deliberately renders nothing from AppContext. The page is opened when something is wrong, so
 * it reads `/api/admin/system-status` on its own and is exempt from AppDataGate — a diagnostics
 * screen that fails alongside the thing it diagnoses is not a diagnostics screen.
 *
 * The API enforces the admin role; this page is a shell around it.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <SystemStatusView />
    </Suspense>
  );
}
