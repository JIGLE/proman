import { Suspense } from "react";
import { TenantDetailView } from "@/components/features/tenant/tenant-detail-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <TenantDetailView tenantId={id} />
    </Suspense>
  );
}
