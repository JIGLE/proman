"use client";

import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
  onHomeClick?: () => void;
}

export function Breadcrumbs({
  items,
  className,
  separator = <ChevronRight className="h-4 w-4 text-zinc-600" />,
  showHome = true,
  onHomeClick,
}: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Home", icon: Home, onClick: onHomeClick }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1.5">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">{separator}</span>}

              {isLast ? (
                <span
                  className="text-zinc-300 font-medium flex items-center gap-1.5"
                  aria-current="page"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </button>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </a>
              ) : (
                <span className="text-zinc-500 flex items-center gap-1.5">
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Navigation tab to breadcrumb mapping
const tabLabels: Record<string, { label: string; group?: string }> = {
  overview: { label: "Dashboard" },
  properties: { label: "Properties", group: "Property Management" },
  units: { label: "Units", group: "Property Management" },
  map: { label: "Map View", group: "Property Management" },
  leases: { label: "Leases", group: "People & Leases" },
  owners: { label: "Owners", group: "People & Leases" },
  tenants: { label: "Tenants", group: "People & Leases" },
  payments: { label: "Payment Matrix", group: "Financial" },
  financials: { label: "Financials", group: "Financial" },
  receipts: { label: "Receipts", group: "Financial" },
  maintenance: { label: "Maintenance", group: "Operations" },
  correspondence: { label: "Correspondence", group: "Operations" },
  analytics: { label: "Analytics", group: "Insights" },
  reports: { label: "Reports", group: "Insights" },
  profile: { label: "Profile", group: "Account" },
  settings: { label: "Settings", group: "Account" },
};

interface NavigationBreadcrumbsProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  className?: string;
  /** Additional context like property name, tenant name */
  context?: { label: string; onClick?: () => void }[];
}

export function NavigationBreadcrumbs({
  activeTab,
  onNavigate,
  className,
  context = [],
}: NavigationBreadcrumbsProps) {
  const tabInfo = tabLabels[activeTab] || { label: activeTab };

  const items: BreadcrumbItem[] = [];

  // Add group if present
  if (tabInfo.group) {
    items.push({ label: tabInfo.group });
  }

  // Add current tab
  items.push({ label: tabInfo.label });

  // Add any additional context
  context.forEach((ctx) => {
    items.push({ label: ctx.label, onClick: ctx.onClick });
  });

  return (
    <Breadcrumbs
      items={items}
      className={className}
      showHome={activeTab !== "overview"}
      onHomeClick={() => onNavigate("overview")}
    />
  );
}

// Compact breadcrumbs for mobile
interface CompactBreadcrumbsProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  className?: string;
}

export function CompactBreadcrumbs({
  activeTab,
  onNavigate,
  className,
}: CompactBreadcrumbsProps) {
  const tabInfo = tabLabels[activeTab] || { label: activeTab };

  if (activeTab === "overview") {
    return (
      <div className={cn("text-sm font-medium text-zinc-300", className)}>
        Dashboard
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <button
        onClick={() => onNavigate("overview")}
        className="text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Home className="h-4 w-4" />
      </button>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <span className="text-zinc-300 font-medium">{tabInfo.label}</span>
    </div>
  );
}
