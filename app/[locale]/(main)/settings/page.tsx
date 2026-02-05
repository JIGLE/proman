import { Suspense } from "react";
import { SettingsView } from "@/components/features/settings/settings-view";
import { GenericPageSkeleton } from "@/components/ui/page-skeletons";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function SettingsPage() {
  return (
    <Suspense fallback={<GenericPageSkeleton />}>
      <div className="h-full">
        <SettingsView />
      </div>
    </Suspense>
  );
}
