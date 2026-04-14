"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/utils";

/** Human-readable labels for known route segments */
const SEGMENT_LABELS: Record<string, string> = {
  overview: "Dashboard",
  properties: "Properties",
  tenants: "Tenants",
  leases: "Leases",
  financials: "Finance",
  maintenance: "Maintenance",
  settings: "Settings",
  correspondence: "Messages",
  contacts: "Contacts",
  owners: "Owners",
  contracts: "Contracts",
  documents: "Documents",
  insights: "Insights",
  analytics: "Analytics",
  reports: "Reports",
};

export interface BreadcrumbOverride {
  /** The entity name to display for dynamic [id] segments, e.g. "Apt T2 Rua das Flores" */
  label: string;
  /** Optional href override for the segment */
  href?: string;
}

interface BreadcrumbsProps {
  /** Override labels for dynamic segments (keyed by segment value, e.g. the entity id) */
  overrides?: Record<string, BreadcrumbOverride>;
  className?: string;
}

export function Breadcrumbs({ overrides, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Split pathname: /pt/properties/123 → ["pt", "properties", "123"]
  const segments = pathname.split("/").filter(Boolean);

  // First segment is the locale — skip it for display but keep for href building
  const locale = segments[0] || "pt";
  const routeSegments = segments.slice(1);

  if (routeSegments.length <= 1) {
    // On top-level pages (e.g. /pt/overview), no breadcrumb needed
    return null;
  }

  const crumbs = routeSegments.map((segment, index) => {
    const href = `/${locale}/${routeSegments.slice(0, index + 1).join("/")}`;
    const isLast = index === routeSegments.length - 1;

    // Check for overrides first (for dynamic segments like entity ids)
    const override = overrides?.[segment];
    const label = override?.label || SEGMENT_LABELS[segment] || decodeURIComponent(segment);

    return { segment, href: override?.href || href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm", className)}>
      {/* Home icon linking to dashboard */}
      <Link
        href={`/${locale}/overview`}
        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        aria-label="Dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
          {crumb.isLast ? (
            <span className="font-medium text-[var(--color-foreground)]" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
