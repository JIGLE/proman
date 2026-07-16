import { Suspense } from "react";

import { AccountView } from "@/components/features/account/account-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AccountPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <div className="h-full">
        <AccountView />
      </div>
    </Suspense>
  );
}
