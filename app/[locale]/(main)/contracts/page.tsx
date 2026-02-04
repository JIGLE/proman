import { Suspense } from "react";
import { ContractsView } from "@/components/features/contracts/contracts-view";

export default function ContractsPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <ContractsView />
    </Suspense>
  );
}
