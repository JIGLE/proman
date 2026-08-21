import { Suspense } from "react";

import { AdminUsersView } from "@/components/features/admin/admin-users-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

/**
 * Admin › Accounts.
 *
 * Reads `/api/admin/users` directly rather than through AppContext — like the status page, this
 * is opened when something is wrong, and it must not depend on the portfolio data loading.
 */
export default function AdminUsersPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <AdminUsersView />
    </Suspense>
  );
}
