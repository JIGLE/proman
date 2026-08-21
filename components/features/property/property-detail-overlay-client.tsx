"use client";

import { useTranslations } from "next-intl";
import { useApp } from "@/lib/contexts/app-context";
import { EntityDetailOverlay } from "@/components/shared/entity-detail-overlay";
import { PropertyDetailView } from "./property-detail-view";

export function PropertyDetailOverlayClient({ id }: { id: string }) {
  const { state } = useApp();
  const t = useTranslations("entityOverlay");
  const property = state.properties.find((p) => p.id === id);

  return (
    <EntityDetailOverlay
      title={t("property.title")}
      description={t("property.description", { name: property?.name ?? id })}
      fullPageHref={`/portfolio/${id}`}
    >
      <PropertyDetailView propertyId={id} />
    </EntityDetailOverlay>
  );
}
