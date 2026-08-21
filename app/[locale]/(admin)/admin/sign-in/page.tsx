import { Suspense } from "react";

import { AdminSignInView } from "@/components/features/admin/admin-sign-in-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

/** Admin › Sign-in. Read-only: what is configured, and whether registration is closed. */
export default function AdminSignInPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <AdminSignInView />
    </Suspense>
  );
}
