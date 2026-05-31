import { Suspense } from "react";
import { LeaseDetailView } from "@/components/features/lease/lease-detail-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <LeaseDetailView leaseId={id} />
    </Suspense>
  );
}
