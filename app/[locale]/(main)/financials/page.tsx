import { Suspense } from "react";
import { FinancialsContainer } from "@/components/features/financial/financials-container";

export const dynamic = 'force-dynamic';

export default function FinancialsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FinancialsContainer />
    </Suspense>
  );
}
