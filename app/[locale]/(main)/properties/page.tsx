"use client";

import { Suspense } from "react";
import { PropertiesView } from "@/components/features/property/property-list";

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading properties…</div>}>
      <div className="h-full">
        <PropertiesView />
      </div>
    </Suspense>
  );
}
