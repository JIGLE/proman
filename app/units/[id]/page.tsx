export const dynamic = "force-dynamic";

import UnitDetail from "@/components/unit-detail";

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main className="p-6">
      <UnitDetail id={id} />
    </main>
  );
}
