"use client";

import { useTranslations } from "next-intl";
import { useApp } from "@/lib/contexts/app-context";
import { EntityDetailOverlay } from "@/components/shared/entity-detail-overlay";
import { useEntityDetailClose } from "@/lib/hooks/use-entity-detail-close";
import { OwnerDetailModal } from "./owner-detail-modal";

export function OwnerDetailOverlayClient({ id }: { id: string }) {
  const { state } = useApp();
  const t = useTranslations("entityOverlay");
  const owner = state.owners.find((o) => o.id === id);
  const handleClose = useEntityDetailClose();

  return (
    <EntityDetailOverlay
      title={t("owner.title")}
      description={t("owner.description", { name: owner?.name ?? id })}
    >
      <OwnerDetailModal ownerId={id} onClose={handleClose} />
    </EntityDetailOverlay>
  );
}
