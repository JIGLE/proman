"use client";

import { useTranslations } from "next-intl";
import { EntityDetailOverlay } from "@/components/shared/entity-detail-overlay";
import { DocumentDetailPanel } from "./document-detail-panel";

export function DocumentDetailOverlayClient({ id }: { id: string }) {
  const t = useTranslations("entityOverlay");

  return (
    <EntityDetailOverlay
      title={t("document.title")}
      description={t("document.description", { name: id })}
    >
      <DocumentDetailPanel documentId={id} />
    </EntityDetailOverlay>
  );
}
