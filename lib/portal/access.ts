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

export const PORTAL_NAV_GROUPS: PortalNavGroup[] = [
  {
    group: "Operations",
    groupLabelKey: "navigation.operationsGroup",
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
        label: "Properties",
        labelKey: "navigation.properties",
        icon: Building2,
        roles: ["owner", "tenant"],
        mobilePrimary: true,
      },
      {
        key: "people",
        href: "/people",
        label: "Tenants",
        labelKey: "navigation.people",
        icon: Users,
        roles: ["owner"],
        mobilePrimary: true,
      },
      {
        key: "maintenance",
        href: "/maintenance",
        label: "Maintenance",
        labelKey: "navigation.maintenance",
        icon: Wrench,
        roles: ["owner"],
      },
      {
        // Folded out of the top-level sidebar (architecture/governance audit 2026-07,
        // Finding 1): vendor/contact management is already reachable inline via
        // People → Service Providers (`people-view.tsx` renders `ContactsView`). Kept as a
        // hidden item so the `/contacts` route stays permitted by `canAccessPortalPath`
        // (which ignores `hidden`) and direct links keep working — it just no longer
        // occupies an Operations row. Brings Operations from 7 → 6 items.
        key: "vendors",
        href: "/contacts",
        label: "Vendors",
        labelKey: "navigation.vendors",
        icon: HardHat,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "financials",
        href: "/financials",
        label: "Accounts",
        labelKey: "navigation.financials",
        icon: Wallet,
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
    group: "Reports",
    groupLabelKey: "navigation.intelligenceGroup",
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
        key: "documents",
        href: "/documents",
        label: "Documents",
        labelKey: "navigation.documents",
        icon: FileBox,
        roles: ["owner", "tenant"],
      },
      {
        key: "correspondence",
        href: "/correspondence",
        label: "Messages",
        labelKey: "navigation.correspondence",
        icon: Mail,
        roles: ["owner"],
      },
    ],
  },
  {
    group: "System",
    groupLabelKey: "navigation.systemGroup",
    items: [
      {
        key: "compliance",
        href: "/compliance/modelo179",
        label: "Compliance",
        labelKey: "navigation.compliance",
        icon: ShieldCheck,
        roles: ["owner"],
      },
      {
        // Grouped under the single "Compliance" hub (architecture/governance audit
        // 2026-07, Finding 1): Modelo 179 and Tax Filing are one job split across two
        // System rows. Tax Filing is now reached via the Compliance sub-nav
        // (`compliance-sub-nav.tsx`) rather than its own sidebar row; kept `hidden` so the
        // route stays permitted by `canAccessPortalPath` (which ignores `hidden`). Brings
        // System from 3 → 2 items and the owner sidebar from 14 → 12.
        key: "tax-filing",
        href: "/compliance/tax-filing",
        label: "Tax Filing",
        labelKey: "navigation.taxFiling",
        icon: Calculator,
        roles: ["owner"],
        hidden: true,
      },
      {
        key: "settings",
        href: "/settings",
        label: "Settings",
        labelKey: "navigation.settings",
        icon: Settings,
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
