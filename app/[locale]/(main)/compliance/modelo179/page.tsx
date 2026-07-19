import { Suspense } from "react";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";
import { Modelo179View } from "@/components/features/compliance/modelo179-view";
import { ComplianceSubNav } from "@/components/features/compliance/compliance-sub-nav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Modelo179Page() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <ComplianceSubNav />
      <Modelo179View />
    </Suspense>
  );
}
