import { Suspense } from "react";
import { FinancialsContainer } from "@/components/features/financial/financials-container";

export default function FinancialsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FinancialsContainer />
    </Suspense>
  );
}
