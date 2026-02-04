import { Suspense } from "react";
import { SettingsView } from "@/components/features/settings/settings-view";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading settings…</div>}>
      <div className="h-full">
        <SettingsView />
      </div>
    </Suspense>
  );
}
