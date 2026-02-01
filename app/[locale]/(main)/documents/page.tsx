import { Suspense } from "react";
import { DocumentsView } from "@/components/features/document/documents-view";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DocumentsView />
    </Suspense>
  );
}
