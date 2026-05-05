import type { ComponentType } from "react";
import {
  BarChart2,
  Building2,
  FileBarChart,
  FileBox,
  FileText,
  Home,
  Mail,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export type PortalRole = "owner" | "tenant";

export interface PortalNavItem {
  key: string;
  href: string;
  label: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  roles: PortalRole[];
  mobilePrimary?: boolean;
  hidden?: boolean;
}

export interface PortalNavGroup {
  group: string;
  items: PortalNavItem[];
}

export const PORTAL_NAV_GROUPS: PortalNavGroup[] = [
  {
    group: "Workspace",
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        label: "Dashboard",
        labelKey: "navigation.dashboard",
        icon: Home,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "properties",
        href: "/portfolio",
        label: "Portfolio",
        labelKey: "navigation.properties",
        icon: Building2,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "buildings",
        href: "/buildings",
        label: "Buildings",
        labelKey: "navigation.buildings",
        icon: Building2,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "tenants",
        href: "/people",
        label: "People",
        labelKey: "navigation.tenants",
        icon: Users,
        roles: ["owner"],
      },
      {
        key: "maintenance",
        href: "/maintenance",
        label: "Maintenance",
        labelKey: "navigation.maintenance",
        icon: Wrench,
        roles: ["owner"],
        mobilePrimary: true,
      },
      {
        key: "financials",
        href: "/financials",
        label: "Financials",
        labelKey: "navigation.financials",
        icon: Wallet,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "documents",
        href: "/documents",
        label: "Documents",
        labelKey: "navigation.documents",
        icon: FileBox,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "leases",
        href: "/leases",
        label: "Leases",
        labelKey: "navigation.leases",
        icon: FileText,
        roles: ["owner", "tenant"],
      },
    ],
  },
  {
    group: "Insights",
    items: [
      {
        key: "analytics",
        href: "/analytics",
        label: "Analytics",
        labelKey: "navigation.analytics",
        icon: BarChart2,
        roles: ["owner"],
      },
      {
        key: "reports",
        href: "/reports",
        label: "Reports",
        labelKey: "navigation.reports",
        icon: FileBarChart,
        roles: ["owner"],
      },
      {
        key: "correspondence",
        href: "/correspondence",
        label: "Correspondence",
        labelKey: "navigation.correspondence",
        icon: Mail,
        roles: ["owner"],
      },
    ],
  },
];

export function getPortalRoleFromSessionRole(role?: string | null): PortalRole {
  return role === "USER" ? "tenant" : "owner";
}

export function getPortalNavigation(role: PortalRole): PortalNavGroup[] {
  return PORTAL_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role) && !item.hidden),
  })).filter((group) => group.items.length > 0);
}

export function getPrimaryMobileNavigation(role: PortalRole): PortalNavItem[] {
  return getPortalNavigation(role)
    .flatMap((group) => group.items)
    .filter((item) => item.mobilePrimary)
    .slice(0, 5);
}

export function getSecondaryMobileNavigation(role: PortalRole): PortalNavItem[] {
  const primaryKeys = new Set(getPrimaryMobileNavigation(role).map((item) => item.key));
  return getPortalNavigation(role)
    .flatMap((group) => group.items)
    .filter((item) => !primaryKeys.has(item.key));
}

export function normalizePortalPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "/dashboard";
  }
  const normalized = `/${segments[1]}`;
  if (normalized === "/overview") return "/dashboard";
  if (normalized === "/properties") return "/portfolio";
  if (normalized === "/tenants") return "/people";
  return normalized;
}

export function canAccessPortalPath(role: PortalRole, pathname: string): boolean {
  const normalizedPath = normalizePortalPath(pathname);
  const allowedItems = PORTAL_NAV_GROUPS.flatMap((group) =>
    group.items.filter((item) => item.roles.includes(role)),
  );
  return allowedItems.some((item) => item.href === normalizedPath);
}
