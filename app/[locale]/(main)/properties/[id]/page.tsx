import { Suspense } from "react";
import { PropertyDetailView } from "@/components/features/property/property-detail-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <PropertyDetailView propertyId={id} />
    </Suspense>
  );
}
