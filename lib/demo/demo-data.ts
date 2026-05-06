/**
 * Demo Data — v2
 *
 * Realistic, fully interconnected dataset for public demo mode.
 * Designed around three explicit UX scenarios:
 *
 *   SCENARIO 1 — Happy Path        → Sunset Apt. 2A  (demo-prop-1)
 *   SCENARIO 2 — Needs Attention   → Marina View Condo (demo-prop-4)  [lease expiring, overdue, open ticket]
 *   SCENARIO 3 — Broken Setup      → Alfama Heritage Loft (demo-prop-6) [no tenant, no lease, no coords]
 *
 * Multi-unit buildings:
 *   demo-building-1  → Sunset Apartments   (Lisbon, Príncipe Real — demo-prop-1 + demo-prop-10)
 *   demo-building-2  → Ribeira Flats       (Porto, Ribeira       — demo-prop-11 + demo-prop-12)
 *
 * Map coverage: 10 of 12 properties have valid coordinates (83 %).
 * Missing coords (intentional): demo-prop-6 (Alfama) and demo-prop-3 (Riverside House).
 *
 * All data uses userId "demo-user" and is completely isolated from production data.
 */

import type {
  Building,
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
  Owner,
  Lease,
  Expense,
  MaintenanceTicket,
} from "@/lib/types";

interface DemoDocument {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: "contract" | "invoice" | "receipt" | "photo" | "floor_plan" | "certificate" | "other";
  mimeType: string;
  storagePath: string;
  fileSize: number;
  propertyId?: string;
  propertyName?: string;
  tenantId?: string;
  tenantName?: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

const DEMO_USER_ID = "demo-user";

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
// Coordinates are real-world accurate and verified against OpenStreetMap.
// Properties intentionally missing coordinates are noted inline.

export const DEMO_PROPERTIES: Property[] = [
  // ── Building 1 — Sunset Apartments, Lisboa Príncipe Real ─────────────────
  // SCENARIO 1: Happy Path — fully configured, tenant + active lease + payments
  {
    id: "demo-prop-1",
    userId: DEMO_USER_ID,
    buildingId: "demo-building-1",
    buildingName: "Sunset Apartments",
    name: "Sunset Apt. 2A",
    address: "Rua Dom Pedro V 74, Lisboa, 1250-097, Portugal",
    streetAddress: "Rua Dom Pedro V 74",
    city: "Lisboa",
    zipCode: "1250-097",
    country: "PT",
    latitude: 38.7158,
    longitude: -9.1481,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 2,
    bathrooms: 2,
    rent: 950,
    description: "Bright 2-bedroom apartment in Príncipe Real. Renovated kitchen, hardwood floors.",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2026-03-01T14:30:00Z",
  },
  {
    id: "demo-prop-10",
    userId: DEMO_USER_ID,
    buildingId: "demo-building-1",
    buildingName: "Sunset Apartments",
    name: "Sunset Apt. 1B",
    address: "Rua Dom Pedro V 74, Lisboa, 1250-097, Portugal",
    streetAddress: "Rua Dom Pedro V 74",
    city: "Lisboa",
    zipCode: "1250-097",
    country: "PT",
    latitude: 38.7158,
    longitude: -9.1481,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 1,
    bathrooms: 1,
    rent: 780,
    description: "Cosy 1-bedroom on the ground floor. Recently repainted. South-facing patio.",
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2026-03-15T10:00:00Z",
  },

  // ── Building 2 — Ribeira Flats, Porto ────────────────────────────────────
  {
    id: "demo-prop-11",
    userId: DEMO_USER_ID,
    buildingId: "demo-building-2",
    buildingName: "Ribeira Flats",
    name: "Ribeira Flat No. 3",
    address: "Rua da Reboleira 22, Porto, 4050-479, Portugal",
    streetAddress: "Rua da Reboleira 22",
    city: "Porto",
    zipCode: "4050-479",
    country: "PT",
    latitude: 41.1407,
    longitude: -8.6145,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 2,
    bathrooms: 1,
    rent: 1050,
    description: "River-view apartment in historic Ribeira. Stone walls, wooden ceiling.",
    createdAt: "2024-09-01T10:00:00Z",
    updatedAt: "2026-02-20T12:00:00Z",
  },
  {
    id: "demo-prop-12",
    userId: DEMO_USER_ID,
    buildingId: "demo-building-2",
    buildingName: "Ribeira Flats",
    name: "Ribeira Flat No. 4",
    address: "Rua da Reboleira 22, Porto, 4050-479, Portugal",
    streetAddress: "Rua da Reboleira 22",
    city: "Porto",
    zipCode: "4050-479",
    country: "PT",
    latitude: 41.1407,
    longitude: -8.6145,
    addressVerified: true,
    type: "apartment",
    status: "vacant",
    bedrooms: 1,
    bathrooms: 1,
    rent: 820,
    description: "Studio-style flat on the top floor. Excellent natural light. Available now.",
    createdAt: "2024-09-01T10:00:00Z",
    updatedAt: "2026-04-28T09:00:00Z",
  },

  // ── Standalone Properties ─────────────────────────────────────────────────
  {
    id: "demo-prop-2",
    userId: DEMO_USER_ID,
    name: "Downtown Office Suite",
    address: "Av. da Liberdade 180, Lisboa, 1250-146, Portugal",
    streetAddress: "Av. da Liberdade 180",
    city: "Lisboa",
    zipCode: "1250-146",
    country: "PT",
    latitude: 38.7188,
    longitude: -9.1441,
    addressVerified: true,
    type: "commercial",
    status: "occupied",
    bedrooms: 0,
    bathrooms: 2,
    rent: 2800,
    description: "Class-A office suite, 120 m². Central HVAC, fibre internet, reception lobby.",
    createdAt: "2024-03-20T09:00:00Z",
    updatedAt: "2026-02-15T16:45:00Z",
  },
  {
    // Intentionally missing coordinates — edge case for map view
    id: "demo-prop-3",
    userId: DEMO_USER_ID,
    name: "Riverside House",
    address: "Rua do Ouro 12, Porto, 4150-458, Portugal",
    streetAddress: "Rua do Ouro 12",
    city: "Porto",
    zipCode: "4150-458",
    country: "PT",
    // latitude / longitude intentionally omitted → triggers "Fix address" CTA
    addressVerified: false,
    type: "house",
    status: "vacant",
    bedrooms: 3,
    bathrooms: 2,
    rent: 1200,
    description:
      "Detached 3-bedroom house with garden and garage. Address not yet verified on map.",
    createdAt: "2024-06-10T11:30:00Z",
    updatedAt: "2026-01-20T08:15:00Z",
  },
  {
    // SCENARIO 2: Needs Attention — lease expiring in <30 days, overdue rent, open ticket
    id: "demo-prop-4",
    userId: DEMO_USER_ID,
    name: "Marina View Condo",
    address: "Rua Comandante Francisco Manuel 8, Faro, 8000-302, Portugal",
    streetAddress: "Rua Comandante Francisco Manuel 8",
    city: "Faro",
    zipCode: "8000-302",
    country: "PT",
    latitude: 37.0162,
    longitude: -7.9323,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 2,
    bathrooms: 2,
    rent: 1100,
    description:
      "Marina-facing condo, 2-bedroom. Tenant lease expires end of May — renewal pending.",
    createdAt: "2024-08-05T13:20:00Z",
    updatedAt: "2026-04-28T10:00:00Z",
  },
  {
    id: "demo-prop-5",
    userId: DEMO_USER_ID,
    name: "Coimbra Student Flat",
    address: "Rua de São João 18, Coimbra, 3000-381, Portugal",
    streetAddress: "Rua de São João 18",
    city: "Coimbra",
    zipCode: "3000-381",
    country: "PT",
    latitude: 40.2094,
    longitude: -8.4226,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 1,
    bathrooms: 1,
    rent: 550,
    description: "Student flat, 2 min walk from University. Furnished. Academic-year lease.",
    createdAt: "2025-01-10T09:00:00Z",
    updatedAt: "2026-03-05T11:00:00Z",
  },
  {
    // SCENARIO 3: Broken Setup — maintenance status, no tenant, no lease, NO coordinates
    id: "demo-prop-6",
    userId: DEMO_USER_ID,
    name: "Alfama Heritage Loft",
    address: "Travessa do Almargem 12, Lisboa, 1100-030, Portugal",
    streetAddress: "Travessa do Almargem 12",
    city: "Lisboa",
    zipCode: "1100-030",
    country: "PT",
    // No latitude / longitude — triggers map alert + "Fix address" CTA in modal
    addressVerified: false,
    type: "apartment",
    status: "maintenance",
    bedrooms: 1,
    bathrooms: 1,
    rent: 800,
    description:
      "Heritage loft under full renovation. No tenant — lease never configured. Address unverified.",
    createdAt: "2025-06-01T08:00:00Z",
    updatedAt: "2026-04-10T15:30:00Z",
  },

  // ── Spanish Properties ────────────────────────────────────────────────────
  {
    id: "demo-prop-7",
    userId: DEMO_USER_ID,
    name: "Eixample Apartment",
    address: "Carrer de Mallorca 234, Barcelona, 08008, España",
    streetAddress: "Carrer de Mallorca 234",
    city: "Barcelona",
    zipCode: "08008",
    country: "ES",
    latitude: 41.3944,
    longitude: 2.1618,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 3,
    bathrooms: 2,
    rent: 1350,
    description: "Modernista building, 3-bed. Zona tensionada — rent cap applies.",
    createdAt: "2025-04-01T10:00:00Z",
    updatedAt: "2026-04-01T12:00:00Z",
  },
  {
    id: "demo-prop-8",
    userId: DEMO_USER_ID,
    name: "Chamberí Studio",
    address: "Calle de Fuencarral 89, Madrid, 28004, España",
    streetAddress: "Calle de Fuencarral 89",
    city: "Madrid",
    zipCode: "28004",
    country: "ES",
    latitude: 40.4309,
    longitude: -3.6982,
    addressVerified: true,
    type: "apartment",
    status: "occupied",
    bedrooms: 1,
    bathrooms: 1,
    rent: 900,
    description: "Top-floor studio in Chamberí. Recently refurbished. Roof terrace access.",
    createdAt: "2025-07-15T09:00:00Z",
    updatedAt: "2026-04-01T11:00:00Z",
  },
  {
    id: "demo-prop-9",
    userId: DEMO_USER_ID,
    name: "Valencia Office",
    address: "Avinguda del Port 45, Valencia, 46024, España",
    streetAddress: "Avinguda del Port 45",
    city: "Valencia",
    zipCode: "46024",
    country: "ES",
    latitude: 39.4617,
    longitude: -0.3347,
    addressVerified: true,
    type: "commercial",
    status: "occupied",
    bedrooms: 0,
    bathrooms: 1,
    rent: 1800,
    description: "Ground-floor commercial unit near the Port. Retail or office use.",
    createdAt: "2024-11-01T08:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_TENANTS: Tenant[] = [
  // Building 1
  {
    id: "demo-tenant-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    name: "Maria Silva",
    email: "maria.silva@email.com",
    phone: "+351 912 345 678",
    leaseStart: "2025-01-01",
    leaseEnd: "2026-12-31",
    rent: 950,
    paymentStatus: "paid",
    createdAt: "2024-12-15T09:00:00Z",
    updatedAt: "2026-04-01T14:30:00Z",
  },
  {
    id: "demo-tenant-9",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-10",
    name: "Sofia Costa",
    email: "sofia.costa@email.com",
    phone: "+351 913 987 654",
    leaseStart: "2025-11-01",
    leaseEnd: "2026-10-31",
    rent: 780,
    paymentStatus: "paid",
    createdAt: "2025-10-15T09:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
  },
  // Building 2
  {
    id: "demo-tenant-10",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-11",
    name: "RC Consultores Lda.",
    email: "geral@rc-consultores.pt",
    phone: "+351 222 111 333",
    leaseStart: "2025-02-01",
    leaseEnd: "2027-01-31",
    rent: 1050,
    paymentStatus: "paid",
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2026-04-01T09:00:00Z",
  },
  // Standalone PT
  {
    id: "demo-tenant-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    name: "TechStart Lda.",
    email: "admin@techstart.pt",
    phone: "+351 213 456 789",
    leaseStart: "2024-06-01",
    leaseEnd: "2027-05-31",
    rent: 2800,
    paymentStatus: "paid",
    createdAt: "2024-05-20T10:30:00Z",
    updatedAt: "2026-04-02T11:15:00Z",
  },
  // SCENARIO 2 — overdue rent, lease expiring soon
  {
    id: "demo-tenant-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    name: "João Mendes",
    email: "joao.mendes@email.com",
    phone: "+351 916 789 012",
    leaseStart: "2025-06-01",
    leaseEnd: "2026-05-28",
    rent: 1100,
    paymentStatus: "overdue",
    createdAt: "2025-05-10T12:00:00Z",
    updatedAt: "2026-04-30T09:20:00Z",
  },
  {
    id: "demo-tenant-4",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-5",
    name: "Ana Ferreira",
    email: "ana.ferreira@email.com",
    phone: "+351 918 567 234",
    leaseStart: "2025-09-01",
    leaseEnd: "2026-08-31",
    rent: 550,
    paymentStatus: "paid",
    createdAt: "2025-08-15T10:00:00Z",
    updatedAt: "2026-04-01T09:00:00Z",
  },
  // SCENARIO 3: demo-prop-6 intentionally has NO tenant
  // Spanish
  {
    id: "demo-tenant-6",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-7",
    name: "Lucía García",
    email: "lucia.garcia@email.com",
    phone: "+34 612 345 678",
    leaseStart: "2025-06-01",
    leaseEnd: "2026-05-31",
    rent: 1350,
    paymentStatus: "paid",
    createdAt: "2025-05-15T10:00:00Z",
    updatedAt: "2026-04-01T12:00:00Z",
  },
  {
    id: "demo-tenant-7",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-8",
    name: "Miguel Rodríguez",
    email: "miguel.rodriguez@email.com",
    phone: "+34 623 456 789",
    leaseStart: "2025-09-01",
    leaseEnd: "2026-08-31",
    rent: 900,
    paymentStatus: "paid",
    createdAt: "2025-08-20T09:00:00Z",
    updatedAt: "2026-04-01T11:00:00Z",
  },
  {
    id: "demo-tenant-8",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-9",
    name: "Innovación Digital SL",
    email: "admin@innovacion-digital.es",
    phone: "+34 634 567 890",
    leaseStart: "2025-01-01",
    leaseEnd: "2027-12-31",
    rent: 1800,
    paymentStatus: "paid",
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// OWNERS
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_OWNERS: Owner[] = [
  {
    id: "demo-owner-1",
    userId: DEMO_USER_ID,
    name: "Carlos Santos",
    email: "carlos.santos@email.com",
    phone: "+351 919 111 222",
    address: "Rua dos Proprietários 100, Lisboa, 1100-001, Portugal",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "demo-owner-2",
    userId: DEMO_USER_ID,
    name: "Investimentos Ibéricos Lda.",
    email: "geral@inv-ibericos.pt",
    phone: "+351 214 333 444",
    address: "Av. da República 200, Lisboa, 1050-191, Portugal",
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2026-01-20T14:30:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LEASES
// ─────────────────────────────────────────────────────────────────────────────
// taxRegime is set on all leases (Portugal = portugal_rendamentos, Spain = spain_inmuebles).
// SCENARIO 3 lease intentionally omits taxRegime to surface the "Set tax regime" action.

export const DEMO_LEASES: Lease[] = [
  // Building 1
  {
    id: "demo-lease-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    tenantId: "demo-tenant-1",
    startDate: "2025-01-01",
    endDate: "2026-12-31",
    monthlyRent: 950,
    deposit: 1900,
    taxRegime: "portugal_rendamentos",
    status: "active",
    autoRenew: true,
    renewalNoticeDays: 60,
    notes:
      "Contrato habitacional padrão. Arrendatária responsbile pelas utilidades. Auto-renovação activa.",
    createdAt: "2024-12-15T09:00:00Z",
    updatedAt: "2025-01-01T10:00:00Z",
  },
  {
    id: "demo-lease-9",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-10",
    tenantId: "demo-tenant-9",
    startDate: "2025-11-01",
    endDate: "2026-10-31",
    monthlyRent: 780,
    deposit: 780,
    taxRegime: "portugal_rendamentos",
    status: "active",
    autoRenew: false,
    renewalNoticeDays: 60,
    notes: "Contrato habitacional de 12 meses. Primeiro arrendamento no imóvel.",
    createdAt: "2025-10-15T09:00:00Z",
    updatedAt: "2025-11-01T08:00:00Z",
  },
  // Building 2
  {
    id: "demo-lease-10",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-11",
    tenantId: "demo-tenant-10",
    startDate: "2025-02-01",
    endDate: "2027-01-31",
    monthlyRent: 1050,
    deposit: 2100,
    taxRegime: "portugal_rendamentos",
    status: "active",
    autoRenew: true,
    renewalNoticeDays: 90,
    notes: "Contrato de arrendamento não habitacional (escritório). Empresa como arrendatário.",
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2025-02-01T08:00:00Z",
  },
  // demo-prop-12 (Ribeira Flat No. 4) is vacant — no lease
  // Standalone PT
  {
    id: "demo-lease-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    tenantId: "demo-tenant-2",
    startDate: "2024-06-01",
    endDate: "2027-05-31",
    monthlyRent: 2800,
    deposit: 5600,
    taxRegime: "portugal_rendamentos",
    status: "active",
    autoRenew: false,
    renewalNoticeDays: 90,
    notes: "Contrato comercial (escritório). Prazo de 3 anos. Inquilino suporta IMI e seguros.",
    createdAt: "2024-05-20T10:30:00Z",
    updatedAt: "2024-06-01T09:00:00Z",
  },
  {
    // SCENARIO 2 — expiring in <30 days from demo date (2026-05-04 reference)
    id: "demo-lease-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    tenantId: "demo-tenant-3",
    startDate: "2025-06-01",
    endDate: "2026-05-28",
    monthlyRent: 1100,
    deposit: 1100,
    taxRegime: "portugal_rendamentos",
    status: "active",
    autoRenew: false,
    renewalNoticeDays: 60,
    notes:
      "Arrendamento expira em 28 Mai 2026. Inquilino notificado mas resposta pendente. Pagamento Abril em falta.",
    createdAt: "2025-05-10T12:00:00Z",
    updatedAt: "2026-04-30T09:00:00Z",
  },
  {
    id: "demo-lease-4",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-5",
    tenantId: "demo-tenant-4",
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    monthlyRent: 550,
    deposit: 550,
    taxRegime: "portugal_rendamentos",
    status: "active",
    autoRenew: false,
    renewalNoticeDays: 60,
    notes: "Arrendamento para fins habitacionais — estudante universitária. Duração: 12 meses.",
    createdAt: "2025-08-15T10:00:00Z",
    updatedAt: "2025-09-01T08:00:00Z",
  },
  {
    // SCENARIO 3 — Alfama Heritage Loft: expired lease, no taxRegime, no active tenant
    id: "demo-lease-6-expired",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-6",
    tenantId: "demo-tenant-1", // Last tenant (departed)
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    monthlyRent: 800,
    deposit: 800,
    // taxRegime intentionally omitted — surfaces "Set tax regime" action in UI
    status: "expired",
    autoRenew: false,
    renewalNoticeDays: 60,
    notes:
      "Arrendamento expirado. Novo arrendamento não criado. Imóvel em renovação desde Março 2025.",
    createdAt: "2024-02-20T10:00:00Z",
    updatedAt: "2025-03-01T09:00:00Z",
  },
  // demo-prop-3 (Riverside House) — vacant, no lease, no tenant
  // Spanish
  {
    id: "demo-lease-6",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-7",
    tenantId: "demo-tenant-6",
    startDate: "2025-06-01",
    endDate: "2026-05-31",
    monthlyRent: 1350,
    deposit: 2700,
    taxRegime: "spain_inmuebles",
    status: "active",
    autoRenew: true,
    renewalNoticeDays: 30,
    notes:
      "Contrato de vivienda estándar. Zona de mercado tensionado — cap de renta aplicado. Auto-renovación activa.",
    createdAt: "2025-05-15T10:00:00Z",
    updatedAt: "2025-06-01T08:00:00Z",
  },
  {
    id: "demo-lease-7",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-8",
    tenantId: "demo-tenant-7",
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    monthlyRent: 900,
    deposit: 900,
    taxRegime: "spain_inmuebles",
    status: "active",
    autoRenew: true,
    renewalNoticeDays: 30,
    notes: "Zona tensionada. Incremento de renta limitado al IPC. Contrato de 12 meses.",
    createdAt: "2025-08-20T09:00:00Z",
    updatedAt: "2025-09-01T08:00:00Z",
  },
  {
    id: "demo-lease-8",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-9",
    tenantId: "demo-tenant-8",
    startDate: "2025-01-01",
    endDate: "2027-12-31",
    monthlyRent: 1800,
    deposit: 3600,
    taxRegime: "spain_inmuebles",
    status: "active",
    autoRenew: false,
    renewalNoticeDays: 90,
    notes:
      "Contrato comercial de 3 años. Inquilino responsable de tributos locales y seguros del local.",
    createdAt: "2024-12-01T08:00:00Z",
    updatedAt: "2025-01-01T09:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPTS  (3 months of history for active leases, Apr + Mar + Feb 2026)
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_RECEIPTS: Receipt[] = [
  // ── April 2026 ──
  {
    id: "demo-receipt-1",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    type: "rent",
    amount: 950,
    date: "2026-04-01",
    status: "paid",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "demo-receipt-r9",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-9",
    tenantName: "Sofia Costa",
    propertyId: "demo-prop-10",
    propertyName: "Sunset Apt. 1B",
    type: "rent",
    amount: 780,
    date: "2026-04-01",
    status: "paid",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T10:05:00Z",
    updatedAt: "2026-04-01T10:05:00Z",
  },
  {
    id: "demo-receipt-r10",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-10",
    tenantName: "RC Consultores Lda.",
    propertyId: "demo-prop-11",
    propertyName: "Ribeira Flat No. 3",
    type: "rent",
    amount: 1050,
    date: "2026-04-01",
    status: "paid",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T09:30:00Z",
    updatedAt: "2026-04-01T09:30:00Z",
  },
  {
    id: "demo-receipt-2",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-2",
    tenantName: "TechStart Lda.",
    propertyId: "demo-prop-2",
    propertyName: "Downtown Office Suite",
    type: "rent",
    amount: 2800,
    date: "2026-04-01",
    status: "paid",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-04-01T09:00:00Z",
  },
  {
    // SCENARIO 2 — overdue / pending for April: João Mendes didn't pay
    id: "demo-receipt-3",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-3",
    tenantName: "João Mendes",
    propertyId: "demo-prop-4",
    propertyName: "Marina View Condo",
    type: "rent",
    amount: 1100,
    date: "2026-04-01",
    status: "pending",
    description: "Renda Abril 2026 — Em falta",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "demo-receipt-4",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-4",
    tenantName: "Ana Ferreira",
    propertyId: "demo-prop-5",
    propertyName: "Coimbra Student Flat",
    type: "rent",
    amount: 550,
    date: "2026-04-01",
    status: "paid",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T08:00:00Z",
    updatedAt: "2026-04-01T08:00:00Z",
  },
  {
    id: "demo-receipt-9",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-6",
    tenantName: "Lucía García",
    propertyId: "demo-prop-7",
    propertyName: "Eixample Apartment",
    type: "rent",
    amount: 1350,
    date: "2026-04-01",
    status: "paid",
    description: "Alquiler Abril 2026",
    createdAt: "2026-04-01T10:30:00Z",
    updatedAt: "2026-04-01T10:30:00Z",
  },
  {
    id: "demo-receipt-10",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-7",
    tenantName: "Miguel Rodríguez",
    propertyId: "demo-prop-8",
    propertyName: "Chamberí Studio",
    type: "rent",
    amount: 900,
    date: "2026-04-01",
    status: "paid",
    description: "Alquiler Abril 2026",
    createdAt: "2026-04-01T11:00:00Z",
    updatedAt: "2026-04-01T11:00:00Z",
  },
  {
    id: "demo-receipt-11",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-8",
    tenantName: "Innovación Digital SL",
    propertyId: "demo-prop-9",
    propertyName: "Valencia Office",
    type: "rent",
    amount: 1800,
    date: "2026-04-01",
    status: "paid",
    description: "Alquiler Abril 2026",
    createdAt: "2026-04-01T09:30:00Z",
    updatedAt: "2026-04-01T09:30:00Z",
  },
  // ── March 2026 ──
  {
    id: "demo-receipt-5",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    type: "rent",
    amount: 950,
    date: "2026-03-01",
    status: "paid",
    description: "Renda Março 2026",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "demo-receipt-r11",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-9",
    tenantName: "Sofia Costa",
    propertyId: "demo-prop-10",
    propertyName: "Sunset Apt. 1B",
    type: "rent",
    amount: 780,
    date: "2026-03-01",
    status: "paid",
    description: "Renda Março 2026",
    createdAt: "2026-03-01T10:05:00Z",
    updatedAt: "2026-03-01T10:05:00Z",
  },
  {
    id: "demo-receipt-6",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-2",
    tenantName: "TechStart Lda.",
    propertyId: "demo-prop-2",
    propertyName: "Downtown Office Suite",
    type: "rent",
    amount: 2800,
    date: "2026-03-01",
    status: "paid",
    description: "Renda Março 2026",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "demo-receipt-7",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-3",
    tenantName: "João Mendes",
    propertyId: "demo-prop-4",
    propertyName: "Marina View Condo",
    type: "rent",
    amount: 1100,
    date: "2026-03-01",
    status: "paid",
    description: "Renda Março 2026",
    createdAt: "2026-03-01T08:00:00Z",
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "demo-receipt-8",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-4",
    tenantName: "Ana Ferreira",
    propertyId: "demo-prop-5",
    propertyName: "Coimbra Student Flat",
    type: "rent",
    amount: 550,
    date: "2026-03-01",
    status: "paid",
    description: "Renda Março 2026",
    createdAt: "2026-03-01T07:00:00Z",
    updatedAt: "2026-03-01T07:00:00Z",
  },
  // ── February 2026 (partial — selected properties) ──
  {
    id: "demo-receipt-f1",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    type: "rent",
    amount: 950,
    date: "2026-02-01",
    status: "paid",
    description: "Renda Fevereiro 2026",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "demo-receipt-f2",
    userId: DEMO_USER_ID,
    tenantId: "demo-tenant-2",
    tenantName: "TechStart Lda.",
    propertyId: "demo-prop-2",
    propertyName: "Downtown Office Suite",
    type: "rent",
    amount: 2800,
    date: "2026-02-01",
    status: "paid",
    description: "Renda Fevereiro 2026",
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-02-01T09:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_EXPENSES: Expense[] = [
  {
    id: "demo-expense-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    category: "maintenance",
    amount: 180,
    date: "2026-03-15",
    description: "Reparação da canalização — cozinha",
    createdAt: "2026-03-15T14:00:00Z",
    updatedAt: "2026-03-16T10:00:00Z",
  },
  {
    id: "demo-expense-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    category: "utilities",
    amount: 420,
    date: "2026-03-05",
    description: "Fatura de eletricidade — Fevereiro 2026",
    createdAt: "2026-03-05T09:00:00Z",
    updatedAt: "2026-03-06T08:00:00Z",
  },
  {
    id: "demo-expense-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    category: "insurance",
    amount: 600,
    date: "2026-01-01",
    description: "Seguro do imóvel — Prémio anual",
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:30:00Z",
  },
  {
    id: "demo-expense-4",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    category: "repairs",
    amount: 250,
    date: "2026-02-20",
    description: "Substituição de vidro — sala de estar",
    createdAt: "2026-02-20T16:00:00Z",
    updatedAt: "2026-02-21T09:00:00Z",
  },
  {
    id: "demo-expense-5",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-6",
    category: "maintenance",
    amount: 4200,
    date: "2026-03-01",
    description: "Obra de renovação — cozinha e casa de banho (fase 1)",
    createdAt: "2026-03-01T11:00:00Z",
    updatedAt: "2026-03-01T11:00:00Z",
  },
  {
    id: "demo-expense-6",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-11",
    category: "repairs",
    amount: 310,
    date: "2026-04-05",
    description: "Substituição de torneiras — casa de banho",
    createdAt: "2026-04-05T10:00:00Z",
    updatedAt: "2026-04-05T10:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE TICKETS
// ─────────────────────────────────────────────────────────────────────────────
// Spread across scenarios:
//   open/in_progress × 4  → drives the open-ticket alert count to 4
//   resolved × 2          → shows history
//   SCENARIO 2 property (demo-prop-4) has 1 open ticket
//   SCENARIO 3 property (demo-prop-6) has 1 in_progress (the renovation)

export const DEMO_MAINTENANCE: MaintenanceTicket[] = [
  {
    // SCENARIO 1 — resolved, shows history
    id: "demo-maint-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    title: "Leaking tap in bathroom",
    description:
      "The bathroom tap has been dripping continuously for the past week. Plumber scheduled.",
    status: "resolved",
    priority: "medium",
    category: "plumbing",
    images: [],
    estimatedCost: 120,
    vendorName: "Canalizações Rápidas Lda.",
    vendorPhone: "+351 910 001 001",
    invoiceRef: "INV-2026-041",
    resolvedAt: "2026-04-05T11:00:00Z",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-04-05T11:00:00Z",
  },
  {
    // Open — commercial property
    id: "demo-maint-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    propertyName: "Downtown Office Suite",
    tenantId: "demo-tenant-2",
    tenantName: "TechStart Lda.",
    title: "HVAC not cooling",
    description:
      "The central air conditioning unit is not producing cold air. Temperatures in the office are uncomfortable.",
    status: "open",
    priority: "high",
    category: "hvac",
    images: [],
    estimatedCost: 850,
    vendorName: "ClimaTech Services",
    vendorPhone: "+351 912 002 002",
    scheduledDate: "2026-05-06T09:00:00Z",
    dueDate: "2026-05-10T18:00:00Z",
    createdAt: "2026-04-03T09:00:00Z",
    updatedAt: "2026-04-03T09:00:00Z",
  },
  {
    // SCENARIO 2 — open ticket on the expiring-lease property
    id: "demo-maint-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    propertyName: "Marina View Condo",
    tenantId: "demo-tenant-3",
    tenantName: "João Mendes",
    title: "Front door lock stiff and unreliable",
    description:
      "The front door lock is increasingly difficult to operate. Tenant concerned about security.",
    status: "open",
    priority: "high",
    category: "structural",
    images: [],
    estimatedCost: 200,
    vendorName: "Serralharia Costa",
    dueDate: "2026-05-08T18:00:00Z",
    isTenantReport: true,
    createdAt: "2026-04-28T10:00:00Z",
    updatedAt: "2026-04-28T10:00:00Z",
  },
  {
    // SCENARIO 3 — in_progress renovation on the broken-setup property
    id: "demo-maint-4",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-6",
    propertyName: "Alfama Heritage Loft",
    title: "Full renovation — kitchen and bathroom remodel",
    description:
      "Heritage loft under full renovation. Kitchen cabinets and bathroom tiling being replaced. No tenant during works.",
    status: "in_progress",
    priority: "low",
    category: "structural",
    images: [],
    estimatedCost: 12000,
    vendorName: "Remodelações Alfama Lda.",
    vendorPhone: "+351 218 001 001",
    invoiceRef: "CONT-2026-006",
    scheduledDate: "2026-03-15T08:00:00Z",
    dueDate: "2026-06-01T18:00:00Z",
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-04-10T15:30:00Z",
  },
  {
    // Spanish portfolio — open, high priority
    id: "demo-maint-5",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-7",
    propertyName: "Eixample Apartment",
    tenantId: "demo-tenant-6",
    tenantName: "Lucía García",
    title: "Boiler not igniting — no hot water or heating",
    description:
      "The gas boiler has not been starting since yesterday. No hot water or heating in the property.",
    status: "open",
    priority: "high",
    category: "hvac",
    images: [],
    estimatedCost: 650,
    vendorName: "Calderas BCN",
    vendorPhone: "+34 931 002 002",
    dueDate: "2026-04-16T18:00:00Z",
    isTenantReport: true,
    createdAt: "2026-04-14T08:30:00Z",
    updatedAt: "2026-04-14T08:30:00Z",
  },
  {
    // Ribeira Flats — recent resolved
    id: "demo-maint-6",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-11",
    propertyName: "Ribeira Flat No. 3",
    tenantId: "demo-tenant-10",
    tenantName: "RC Consultores Lda.",
    title: "Bathroom taps replaced",
    description: "Old taps showing wear. Replaced all three taps in the main bathroom.",
    status: "resolved",
    priority: "low",
    category: "plumbing",
    images: [],
    estimatedCost: 180,
    vendorName: "Canalizações Rápidas Lda.",
    invoiceRef: "INV-2026-038",
    resolvedAt: "2026-04-06T14:00:00Z",
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-04-06T14:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES & CORRESPONDENCE
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_TEMPLATES: CorrespondenceTemplate[] = [
  {
    id: "demo-template-1",
    name: "Lembrete de Renda",
    type: "rent_reminder",
    subject: "Lembrete de Pagamento de Renda",
    content:
      "Caro(a) {{tenant_name}},\n\nEste é um lembrete amigável de que o pagamento da renda no valor de €{{amount}} é devido a {{due_date}}.\n\nObrigado,\nGestão do Imóvel",
    variables: ["tenant_name", "amount", "due_date"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "demo-template-2",
    name: "Aviso de Manutenção",
    type: "maintenance_request",
    subject: "Manutenção Programada",
    content:
      "Caro(a) {{tenant_name}},\n\nIremos realizar manutenção programada a {{date}}. Por favor, garanta acesso a {{area}}.\n\nCumprimentos,\nEquipa de Manutenção",
    variables: ["tenant_name", "date", "area"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const DEMO_CORRESPONDENCE: Correspondence[] = [
  {
    id: "demo-corr-1",
    userId: DEMO_USER_ID,
    templateId: "demo-template-1",
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    subject: "Bem-vinda ao Sunset Apartments",
    content:
      "Cara Maria,\n\nBem-vinda ao Sunset Apt. 2A! Estamos muito satisfeitos por tê-la como inquilina.\n\nCumprimentos,\nGestão do Imóvel",
    status: "sent",
    sentAt: "2025-01-01T12:00:00Z",
    createdAt: "2025-01-01T11:50:00Z",
    updatedAt: "2025-01-01T12:00:00Z",
  },
  {
    id: "demo-corr-2",
    userId: DEMO_USER_ID,
    templateId: "demo-template-1",
    tenantId: "demo-tenant-3",
    tenantName: "João Mendes",
    subject: "Renda em Atraso — Abril 2026",
    content:
      "Caro João,\n\nVerificámos que o pagamento da renda referente a Abril 2026 (€1.100) ainda não foi efectuado.\n\nPor favor proceda ao pagamento até 15 de Abril.\n\nCumprimentos,\nGestão do Imóvel",
    status: "sent",
    sentAt: "2026-04-10T09:00:00Z",
    createdAt: "2026-04-10T08:50:00Z",
    updatedAt: "2026-04-10T09:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: "demo-document-1",
    userId: DEMO_USER_ID,
    name: "Lease Agreement — Maria Silva.pdf",
    description: "Signed residential lease for Sunset Apt. 2A.",
    type: "contract",
    mimeType: "application/pdf",
    storagePath: "/demo/documents/lease-maria-silva.pdf",
    fileSize: 248000,
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    uploadedAt: "2025-01-01T09:00:00Z",
    createdAt: "2025-01-01T09:00:00Z",
    updatedAt: "2025-01-01T09:00:00Z",
  },
  {
    id: "demo-document-2",
    userId: DEMO_USER_ID,
    name: "April Rent Receipt — Maria Silva.pdf",
    description: "Rent receipt for April 2026.",
    type: "receipt",
    mimeType: "application/pdf",
    storagePath: "/demo/documents/april-rent-receipt.pdf",
    fileSize: 132000,
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    tenantId: "demo-tenant-1",
    tenantName: "Maria Silva",
    uploadedAt: "2026-04-01T10:15:00Z",
    createdAt: "2026-04-01T10:15:00Z",
    updatedAt: "2026-04-01T10:15:00Z",
  },
  {
    id: "demo-document-3",
    userId: DEMO_USER_ID,
    name: "Building Insurance Certificate.pdf",
    description: "Annual insurance certificate for Sunset Apartments building.",
    type: "certificate",
    mimeType: "application/pdf",
    storagePath: "/demo/documents/building-insurance-certificate.pdf",
    fileSize: 198000,
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apt. 2A",
    uploadedAt: "2026-01-01T15:00:00Z",
    createdAt: "2026-01-01T15:00:00Z",
    updatedAt: "2026-01-01T15:00:00Z",
  },
  {
    id: "demo-document-4",
    userId: DEMO_USER_ID,
    name: "Commercial Lease — TechStart Lda..pdf",
    description: "3-year commercial lease agreement for Downtown Office Suite.",
    type: "contract",
    mimeType: "application/pdf",
    storagePath: "/demo/documents/lease-techstart.pdf",
    fileSize: 312000,
    propertyId: "demo-prop-2",
    propertyName: "Downtown Office Suite",
    tenantId: "demo-tenant-2",
    tenantName: "TechStart Lda.",
    uploadedAt: "2024-06-01T10:00:00Z",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-06-01T10:00:00Z",
  },
  {
    id: "demo-document-5",
    userId: DEMO_USER_ID,
    name: "Renovation Scope — Alfama Heritage Loft.pdf",
    description: "Contractor scope of works for full kitchen and bathroom renovation.",
    type: "other",
    mimeType: "application/pdf",
    storagePath: "/demo/documents/renovation-scope-alfama.pdf",
    fileSize: 175000,
    propertyId: "demo-prop-6",
    propertyName: "Alfama Heritage Loft",
    uploadedAt: "2026-03-01T11:30:00Z",
    createdAt: "2026-03-01T11:30:00Z",
    updatedAt: "2026-03-01T11:30:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BUILDINGS
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_BUILDINGS: Building[] = [
  {
    id: "demo-building-1",
    userId: DEMO_USER_ID,
    name: "Sunset Apartments",
    address: "Rua Dom Pedro V 74",
    city: "Lisboa",
    country: "PT",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2026-03-01T14:30:00Z",
  },
  {
    id: "demo-building-2",
    userId: DEMO_USER_ID,
    name: "Ribeira Flats",
    address: "Cais da Ribeira 22",
    city: "Porto",
    country: "PT",
    createdAt: "2024-03-10T09:00:00Z",
    updatedAt: "2026-02-15T11:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATION  (unchanged API surface)
// ─────────────────────────────────────────────────────────────────────────────

export type DemoEntityType =
  | "properties"
  | "tenants"
  | "receipts"
  | "documents"
  | "templates"
  | "correspondence"
  | "owners"
  | "expenses"
  | "maintenance"
  | "leases"
  | "contacts"
  | "buildings";

const DEMO_DATA_MAP: Record<DemoEntityType, unknown[]> = {
  properties: DEMO_PROPERTIES,
  tenants: DEMO_TENANTS,
  receipts: DEMO_RECEIPTS,
  documents: DEMO_DOCUMENTS,
  templates: DEMO_TEMPLATES,
  correspondence: DEMO_CORRESPONDENCE,
  owners: DEMO_OWNERS,
  expenses: DEMO_EXPENSES,
  maintenance: DEMO_MAINTENANCE,
  leases: DEMO_LEASES,
  contacts: [],
  buildings: DEMO_BUILDINGS,
};

/** Get demo data for a given entity type. Returns a deep copy. */
export function getDemoData<T = unknown>(entityType: DemoEntityType): T[] {
  const data = DEMO_DATA_MAP[entityType];
  if (!data) return [];
  return JSON.parse(JSON.stringify(data)) as T[];
}

/** Get a single demo entity by ID. Returns a deep copy or null. */
export function getDemoDataById<T extends { id: string }>(
  entityType: DemoEntityType,
  id: string,
): T | null {
  const data = DEMO_DATA_MAP[entityType] as T[];
  const item = data.find((d) => d.id === id);
  return item ? (JSON.parse(JSON.stringify(item)) as T) : null;
}
