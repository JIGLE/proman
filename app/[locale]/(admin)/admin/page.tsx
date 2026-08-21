import { Suspense } from "react";

import { AdminControlCenter } from "@/components/features/admin/control-center/admin-control-center";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

/**
 * Admin › Control center.
 *
 * The instance at a glance: status, access, metrics, accounts and the bank workbench in one view
 * that does not scroll above `lg`. The tabs remain, and remain the place the full detail lives —
 * this is the layer above them, so "is anything wrong?" is answerable without visiting four pages.
 *
 * Deliberately renders nothing from AppContext, like the status page it grew out of. It is opened
 * when something is wrong, so it reads the admin APIs on its own and is exempt from AppDataGate.
 * The APIs enforce the admin role; this page is a shell around them.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <AdminControlCenter />
    </Suspense>
  );
}
