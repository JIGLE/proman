"use client";

import dynamic from "next/dynamic";

// This experimental page composes canonical providers outside the [locale]
// layout, so it can't be server-rendered. Render it client-only to keep it
// out of the static prerender pass.
const LeasesClient = dynamic(() => import("./leases-client"), { ssr: false });

export default function Page() {
  return <LeasesClient />;
}
