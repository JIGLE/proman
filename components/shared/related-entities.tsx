"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Building2, Users, FileText, Wrench, Receipt } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { EntityLink, type EntityType } from "@/components/shared/entity-link";

export interface RelatedEntityItem {
  type: EntityType;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusVariant?: "default" | "success" | "warning" | "destructive";
}

interface BackContext {
  type: EntityType;
  id: string;
  label: string;
}

interface RelatedEntitiesProps {
  /** Optional "← back to <parent>" chip that preserves navigation context. */
  back?: BackContext;
  /** The related entities to surface directly under a detail header. */
  items: RelatedEntityItem[];
  className?: string;
}

const BACK_CONFIG: Record<
  EntityType,
  { icon: React.ComponentType<{ className?: string }>; basePath: string }
> = {
  property: { icon: Building2, basePath: "/portfolio" },
  tenant: { icon: Users, basePath: "/people" },
  lease: { icon: FileText, basePath: "/leases" },
  maintenance: { icon: Wrench, basePath: "/maintenance" },
  receipt: { icon: Receipt, basePath: "/financials" },
};

/**
 * Compact, consistent representation of how an entity relates to others.
 * Rendered directly under a detail header so a user can always see — and
 * navigate to — the connected Property / Tenant / Lease / Receipts /
 * Maintenance without hunting through tabs. The optional back chip keeps
 * "where did I come from" context when drilling between related records.
 */
export function RelatedEntities({
  back,
  items,
  className,
}: RelatedEntitiesProps): React.ReactElement | null {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt";

  if (!back && items.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {back && (
        <Link
          href={`/${locale}${BACK_CONFIG[back.type].basePath}/${back.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {back.label}
        </Link>
      )}

      {items.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <EntityLink
              key={`${item.type}-${item.id}`}
              type={item.type}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              status={item.status}
              statusVariant={item.statusVariant}
              variant="card"
            />
          ))}
        </div>
      )}
    </div>
  );
}
