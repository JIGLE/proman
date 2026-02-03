import { Suspense } from "react";
import { AssetsView } from "@/components/features/assets/assets-view";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AssetsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading assets…</div>}>
      <div className="h-full">
        <AssetsView />
      </div>
    </Suspense>
  );
}
