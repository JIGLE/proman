import { Suspense } from "react";
import { OwnersView } from "@/components/features/owner/owners-view";

export const dynamic = 'force-dynamic';

export default function OwnersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OwnersView />
    </Suspense>
  );
}
