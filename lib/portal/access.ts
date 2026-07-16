import type { ComponentType } from "react";
import {
  BarChart2,
  Building2,
  Calculator,
  FileBarChart,
  FileBox,
  FileText,
  HardHat,
  Home,
  Mail,
  Settings,
  ShieldCheck,
  UserCircle,
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
  groupLabelKey: string;
  items: PortalNavItem[];
}

// Situs // Sovereign Capital System information architecture (PR 2 of the rebrand):
// two groups — Core (the owner's daily surfaces) and System (configuration + identity) —
// mirroring the approved Mockup.html nav rail. Nav LABELS are the Situs pillars; several
// underlying route PATHS are unchanged in this PR (path renames + redirects land in a
// follow-up) — e.g. Finance still serves from `/financials`, Operations from `/maintenance`,
// Intelligence from `/analytics`. Consolidated surfaces (Reports, Compliance/Tax Filing,
// Messages, Leases, Vendors) are kept as `hidden` items so their routes stay permitted by
// `canAccessPortalPath` (which ignores `hidden`) and existing deep links keep working — they
// are reached from within their new home pillar rather than occupying their own rail row.
export const PORTAL_NAV_GROUPS: PortalNavGroup[] = [
  {
    group: "Core",
    groupLabelKey: "navigation.coreGroup",
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        label: "Home",
        labelKey: "navigation.home",
        icon: Home,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "properties",
        href: "/portfolio",
        label: "Portfolio",
        labelKey: "navigation.portfolio",
        icon: Building2,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "financials",
        href: "/financials",
        label: "Finance",
        labelKey: "navigation.finance",
        icon: Wallet,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "maintenance",
        href: "/maintenance",
        label: "Operations",
        labelKey: "navigation.operations",
        icon: Wrench,
        roles: ["owner"],
      },
      {
        key: "people",
        href: "/people",
        label: "People",
        labelKey: "navigation.people",
        icon: Users,
        roles: ["owner"],
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
        key: "analytics",
        href: "/analytics",
        label: "Intelligence",
        labelKey: "navigation.intelligence",
        icon: BarChart2,
        roles: ["owner"],
      },
    ],
  },
  {
    group: "System",
    groupLabelKey: "navigation.systemGroup",
    items: [
      {
        key: "settings",
        href: "/settings",
        label: "Settings",
        labelKey: "navigation.settings",
        icon: Settings,
        roles: ["owner"],
      },
      {
        key: "account",
        href: "/account",
        label: "Account",
        labelKey: "navigation.account",
        icon: UserCircle,
        roles: ["owner", "tenant"],
      },
    ],
  },
  {
    // Hidden group: routes that no longer own a rail row but must stay reachable/permitted.
    // Reached from within their new home pillar (Intelligence, People, Property detail).
    group: "Hidden",
    groupLabelKey: "navigation.systemGroup",
    items: [
      {
        key: "reports",
        href: "/reports",
        label: "Reports",
        labelKey: "navigation.reports",
        icon: FileBarChart,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "correspondence",
        href: "/correspondence",
        label: "Messages",
        labelKey: "navigation.correspondence",
        icon: Mail,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "compliance",
        href: "/compliance/modelo179",
        label: "Compliance",
        labelKey: "navigation.compliance",
        icon: ShieldCheck,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "tax-filing",
        href: "/compliance/tax-filing",
        label: "Tax Filing",
        labelKey: "navigation.taxFiling",
        icon: Calculator,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "leases",
        href: "/leases",
        label: "Leases",
        labelKey: "navigation.leases",
        icon: FileText,
        roles: ["owner", "tenant"],
        hidden: true,
      },
      {
        key: "vendors",
        href: "/contacts",
        label: "Vendors",
        labelKey: "navigation.vendors",
        icon: HardHat,
        roles: ["owner"],
        hidden: true,
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
  if (normalized === "/vendors") return "/contacts";
  return normalized;
}

export function canAccessPortalPath(role: PortalRole, pathname: string): boolean {
  const normalizedPath = normalizePortalPath(pathname);
  const allowedItems = PORTAL_NAV_GROUPS.flatMap((group) =>
    group.items.filter((item) => item.roles.includes(role)),
  );
  // Match exact href OR check if the normalized path is a prefix of a nav item's href
  return allowedItems.some(
    (item) => item.href === normalizedPath || item.href.startsWith(normalizedPath + "/"),
  );
}
