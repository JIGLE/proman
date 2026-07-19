import { Suspense } from "react";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";
import { TaxFilingView } from "@/components/features/compliance/tax-filing-view";
import { ComplianceSubNav } from "@/components/features/compliance/compliance-sub-nav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function TaxFilingPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <ComplianceSubNav />
      <TaxFilingView />
    </Suspense>
  );
}
