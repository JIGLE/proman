import { Suspense } from "react";
import { TaxRulesView } from "@/components/features/settings/tax-rules-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function TaxRulesPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <div className="h-full">
        <TaxRulesView />
      </div>
    </Suspense>
  );
}
