import type {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
  Owner,
  Expense,
  MaintenanceTicket,
  Lease,
} from "@/lib/types";

export type PortalRole = "owner" | "tenant";

export const DEFAULT_DEMO_ROLE: PortalRole = "owner";
export const DEFAULT_DEMO_TENANT_ID = "demo-tenant-1";

export const OWNER_NAV_KEYS = [
  "home",
  "assets",
  "people",
  "leases",
  "finance",
  "maintenance",
  "documents",
  "contacts",
  "owners",
  "analytics",
  "reports",
  "settings",
] as const;

export const TENANT_NAV_KEYS = ["home", "assets", "leases", "finance", "documents"] as const;

export const TENANT_ALLOWED_PATH_PREFIXES = [
  "/overview",
  "/properties",
  "/leases",
  "/financials",
  "/documents",
] as const;

export interface PortalAppState {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  templates: CorrespondenceTemplate[];
  correspondence: Correspondence[];
  owners: Owner[];
  expenses: Expense[];
  maintenance: MaintenanceTicket[];
  leases: Lease[];
  loading: boolean;
  error: string | null;
}

export function getAllowedNavKeys(role: PortalRole): readonly string[] {
  return role === "tenant" ? TENANT_NAV_KEYS : OWNER_NAV_KEYS;
}

export function canAccessPath(role: PortalRole, pathname: string): boolean {
  if (role !== "tenant") return true;
  return TENANT_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveTenantContext(
  tenants: Tenant[],
  role: PortalRole,
  tenantId?: string | null,
  tenantEmail?: string | null,
): Tenant | null {
  if (role !== "tenant") return null;
  if (tenantId) {
    const tenantById = tenants.find((tenant) => tenant.id === tenantId);
    if (tenantById) return tenantById;
  }
  if (tenantEmail) {
    const tenantByEmail = tenants.find(
      (tenant) => tenant.email.toLowerCase() === tenantEmail.toLowerCase(),
    );
    if (tenantByEmail) return tenantByEmail;
  }
  return tenants[0] ?? null;
}

export function filterStateForRole(
  state: PortalAppState,
  role: PortalRole,
  tenantId?: string | null,
  tenantEmail?: string | null,
): PortalAppState {
  if (role !== "tenant") {
    return state;
  }

  const activeTenant = resolveTenantContext(state.tenants, role, tenantId, tenantEmail);
  if (!activeTenant) {
    return {
      ...state,
      properties: [],
      tenants: [],
      receipts: [],
      templates: [],
      correspondence: [],
      owners: [],
      expenses: [],
      maintenance: [],
      leases: [],
    };
  }

  const leases = state.leases.filter((lease) => lease.tenantId === activeTenant.id);
  const propertyIds = new Set(
    [activeTenant.propertyId, ...leases.map((lease) => lease.propertyId)].filter(
      Boolean,
    ) as string[],
  );

  return {
    ...state,
    properties: state.properties.filter((property) => propertyIds.has(property.id)),
    tenants: [activeTenant],
    receipts: state.receipts.filter((receipt) => receipt.tenantId === activeTenant.id),
    templates: [],
    correspondence: state.correspondence.filter((message) => message.tenantId === activeTenant.id),
    owners: [],
    expenses: [],
    maintenance: state.maintenance.filter(
      (ticket) => ticket.tenantId === activeTenant.id || propertyIds.has(ticket.propertyId),
    ),
    leases,
  };
}

export function filterEntityListForTenant<T extends { tenantId?: string; propertyId?: string }>(
  items: T[],
  tenantId?: string | null,
  propertyIds?: Iterable<string>,
): T[] {
  if (!tenantId) return [];
  const allowedPropertyIds = new Set(propertyIds ?? []);
  return items.filter(
    (item) =>
      item.tenantId === tenantId || (!!item.propertyId && allowedPropertyIds.has(item.propertyId)),
  );
}
