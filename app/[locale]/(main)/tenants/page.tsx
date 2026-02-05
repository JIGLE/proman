import { Suspense } from "react";
import { PeopleView } from "@/components/features/people/people-view";
import { PeopleListSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function PeoplePage() {
  return (
    <Suspense fallback={<PeopleListSkeleton />}>
      <div className="h-full">
        <PeopleView />
      </div>
    </Suspense>
  );
}
