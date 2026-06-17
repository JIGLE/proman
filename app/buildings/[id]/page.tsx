export const dynamic = "force-dynamic";

import BuildingDetail from "@/components/building-detail";

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main className="p-6">
      <BuildingDetail id={id} />
    </main>
  );
}
