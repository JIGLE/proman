"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import PropertyDetailSheetClient from "./property-detail-sheet-client";

export default function PropertyDetailRouteClient() {
  const searchParams = useSearchParams();
  const modal = searchParams?.get("modal");

  if (!modal) return null;

  return <PropertyDetailSheetClient id={modal} />;
}
