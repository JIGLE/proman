"use client";

import { useTranslations } from "next-intl";
import { useApp } from "@/lib/contexts/app-context";
import { EntityDetailOverlay } from "@/components/shared/entity-detail-overlay";
import { LeaseDetailView } from "./lease-detail-view";

export function LeaseDetailOverlayClient({ id }: { id: string }) {
  const { state } = useApp();
  const t = useTranslations("entityOverlay");
  const lease = state.leases.find((l) => l.id === id);
  const tenantName = state.tenants.find((t) => t.id === lease?.tenantId)?.name;

  return (
    <EntityDetailOverlay
      title={t("lease.title")}
      description={t("lease.description", { name: tenantName ?? id })}
      fullPageHref={`/leases/${id}`}
    >
      <LeaseDetailView leaseId={id} />
    </EntityDetailOverlay>
  );
}
