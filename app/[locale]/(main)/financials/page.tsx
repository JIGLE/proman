import { Suspense } from "react";
import { FinancialsContainer } from "@/components/features/financial/financials-container";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function FinancialsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <FinancialsContainer />
    </Suspense>
  );
}
