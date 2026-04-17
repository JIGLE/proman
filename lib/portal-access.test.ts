import { describe, expect, it } from "vitest";
import { canAccessPath, filterStateForRole, getAllowedNavKeys } from "@/lib/portal-access";

const baseState = {
  properties: [
    {
      id: "prop-1",
      userId: "user-1",
      name: "Sunset Apartments",
      address: "Rua do Sol 123",
      type: "apartment" as const,
      bedrooms: 2,
      bathrooms: 1,
      rent: 950,
      status: "occupied" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "prop-2",
      userId: "user-1",
      name: "Downtown Office",
      address: "Av. Central 20",
      type: "commercial" as const,
      bedrooms: 0,
      bathrooms: 1,
      rent: 2800,
      status: "occupied" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  tenants: [
    {
      id: "tenant-1",
      userId: "user-1",
      propertyId: "prop-1",
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "123",
      rent: 950,
      leaseStart: "2026-01-01",
      leaseEnd: "2026-12-31",
      paymentStatus: "paid" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "tenant-2",
      userId: "user-1",
      propertyId: "prop-2",
      name: "TechStart",
      email: "tech@example.com",
      phone: "456",
      rent: 2800,
      leaseStart: "2026-01-01",
      leaseEnd: "2026-12-31",
      paymentStatus: "paid" as const,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  receipts: [
    {
      id: "receipt-1",
      userId: "user-1",
      tenantId: "tenant-1",
      tenantName: "Maria Silva",
      propertyId: "prop-1",
      propertyName: "Sunset Apartments",
      amount: 950,
      date: "2026-04-01",
      type: "rent" as const,
      status: "paid" as const,
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    },
  ],
  templates: [],
  correspondence: [],
  owners: [],
  expenses: [],
  maintenance: [],
  leases: [
    {
      id: "lease-1",
      userId: "user-1",
      propertyId: "prop-1",
      tenantId: "tenant-1",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      monthlyRent: 950,
      deposit: 1900,
      status: "active" as const,
      autoRenew: true,
      renewalNoticeDays: 60,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  loading: false,
  error: null,
};

describe("portal access helpers", () => {
  it("keeps owner access unrestricted", () => {
    expect(canAccessPath("owner", "/owners")).toBe(true);
    expect(getAllowedNavKeys("owner")).toContain("owners");
  });

  it("restricts tenant routes and navigation", () => {
    expect(canAccessPath("tenant", "/financials")).toBe(true);
    expect(canAccessPath("tenant", "/owners")).toBe(false);
    expect(getAllowedNavKeys("tenant")).not.toContain("owners");
  });

  it("filters tenant state to only the active tenant scope", () => {
    const filtered = filterStateForRole(baseState, "tenant", "tenant-1");

    expect(filtered.properties).toHaveLength(1);
    expect(filtered.properties[0].id).toBe("prop-1");
    expect(filtered.tenants).toHaveLength(1);
    expect(filtered.tenants[0].id).toBe("tenant-1");
    expect(filtered.leases).toHaveLength(1);
    expect(filtered.receipts).toHaveLength(1);
    expect(filtered.expenses).toHaveLength(0);
    expect(filtered.owners).toHaveLength(0);
  });
});
