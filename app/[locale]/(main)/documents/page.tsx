import { Suspense } from "react";
import { DocumentsView } from "@/components/features/document/documents-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';

export default function DocumentsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <DocumentsView />
    </Suspense>
  );
}
