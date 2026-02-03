import { Suspense } from "react";
import { PeopleView } from "@/components/features/people/people-view";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading people…</div>}>
      <div className="h-full">
        <PeopleView />
      </div>
    </Suspense>
  );
}
