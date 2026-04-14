/**
 * Demo Data
 *
 * Extended mock dataset for the public demo mode.
 * Provides realistic, interconnected data across all entity types.
 * All data uses userId "demo-user" and is completely isolated.
 */

import type {
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

const DEMO_USER_ID = "demo-user";

// ── Properties ─────────────────────────────────────────
export const DEMO_PROPERTIES: Property[] = [
  {
    id: "demo-prop-1",
    userId: DEMO_USER_ID,
    name: "Sunset Apartments",
    address: "Rua do Sol 123, Lisboa, 1200-001, Portugal",
    streetAddress: "Rua do Sol 123",
    city: "Lisboa",
    zipCode: "1200-001",
    country: "Portugal",
    type: "apartment",
    status: "occupied",
    bedrooms: 2,
    bathrooms: 2,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2026-03-01T14:30:00Z",
  },
  {
    id: "demo-prop-2",
    userId: DEMO_USER_ID,
    name: "Downtown Office Suite",
    address: "Av. da Liberdade 456, Lisboa, 1250-096, Portugal",
    streetAddress: "Av. da Liberdade 456",
    city: "Lisboa",
    zipCode: "1250-096",
    country: "Portugal",
    type: "commercial",
    status: "occupied",
    createdAt: "2024-03-20T09:00:00Z",
    updatedAt: "2026-02-15T16:45:00Z",
  },
  {
    id: "demo-prop-3",
    userId: DEMO_USER_ID,
    name: "Riverside House",
    address: "Rua do Rio 789, Porto, 4000-321, Portugal",
    streetAddress: "Rua do Rio 789",
    city: "Porto",
    zipCode: "4000-321",
    country: "Portugal",
    type: "house",
    status: "vacant",
    bedrooms: 3,
    bathrooms: 2,
    createdAt: "2024-06-10T11:30:00Z",
    updatedAt: "2026-01-20T08:15:00Z",
  },
  {
    id: "demo-prop-4",
    userId: DEMO_USER_ID,
    name: "Marina View Condo",
    address: "Rua da Marina 321, Faro, 8000-123, Portugal",
    streetAddress: "Rua da Marina 321",
    city: "Faro",
    zipCode: "8000-123",
    country: "Portugal",
    type: "apartment",
    status: "occupied",
    bedrooms: 2,
    bathrooms: 2,
    createdAt: "2024-08-05T13:20:00Z",
    updatedAt: "2026-03-28T10:00:00Z",
  },
  {
    id: "demo-prop-5",
    userId: DEMO_USER_ID,
    name: "Coimbra Student Flat",
    address: "Rua da Universidade 55, Coimbra, 3000-200, Portugal",
    streetAddress: "Rua da Universidade 55",
    city: "Coimbra",
    zipCode: "3000-200",
    country: "Portugal",
    type: "apartment",
    status: "occupied",
    bedrooms: 1,
    bathrooms: 1,
    createdAt: "2025-01-10T09:00:00Z",
    updatedAt: "2026-03-05T11:00:00Z",
  },
] as unknown as Property[];

// ── Tenants ────────────────────────────────────────────
export const DEMO_TENANTS: Tenant[] = [
  {
    id: "demo-tenant-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    name: "Maria Silva",
    email: "maria.silva@email.com",
    phone: "+351-912-345-678",
    leaseStart: "2025-01-01",
    leaseEnd: "2026-12-31",
    monthlyRent: 950,
    securityDeposit: 1900,
    paymentStatus: "current",
    createdAt: "2024-12-15T09:00:00Z",
    updatedAt: "2026-03-05T14:30:00Z",
  },
  {
    id: "demo-tenant-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    name: "TechStart Lda.",
    email: "admin@techstart.pt",
    phone: "+351-213-456-789",
    leaseStart: "2024-06-01",
    leaseEnd: "2027-05-31",
    monthlyRent: 2800,
    securityDeposit: 5600,
    paymentStatus: "current",
    createdAt: "2024-05-20T10:30:00Z",
    updatedAt: "2026-03-02T11:15:00Z",
  },
  {
    id: "demo-tenant-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    name: "João Mendes",
    email: "joao.mendes@email.com",
    phone: "+351-916-789-012",
    leaseStart: "2025-03-01",
    leaseEnd: "2026-02-28",
    monthlyRent: 1100,
    securityDeposit: 1100,
    paymentStatus: "overdue",
    createdAt: "2025-02-10T12:00:00Z",
    updatedAt: "2026-04-01T09:20:00Z",
  },
  {
    id: "demo-tenant-4",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-5",
    name: "Ana Ferreira",
    email: "ana.ferreira@email.com",
    phone: "+351-918-567-234",
    leaseStart: "2025-09-01",
    leaseEnd: "2026-08-31",
    monthlyRent: 550,
    securityDeposit: 550,
    paymentStatus: "current",
    createdAt: "2025-08-15T10:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
] as unknown as Tenant[];

// ── Owners ─────────────────────────────────────────────
export const DEMO_OWNERS: Owner[] = [
  {
    id: "demo-owner-1",
    userId: DEMO_USER_ID,
    name: "Carlos Santos",
    email: "carlos.santos@email.com",
    phone: "+351-919-111-222",
    address: "Rua dos Proprietários 100, Lisboa, 1100-001, Portugal",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "demo-owner-2",
    userId: DEMO_USER_ID,
    name: "Investimentos Ibéricos Lda.",
    email: "geral@inv-ibericos.pt",
    phone: "+351-214-333-444",
    address: "Av. da República 200, Lisboa, 1050-191, Portugal",
    status: "active",
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2026-01-20T14:30:00Z",
  },
] as unknown as Owner[];

// ── Leases ─────────────────────────────────────────────
export const DEMO_LEASES: Lease[] = [
  {
    id: "demo-lease-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    tenantId: "demo-tenant-1",
    startDate: "2025-01-01",
    endDate: "2026-12-31",
    monthlyRent: 950,
    securityDeposit: 1900,
    status: "active",
    terms: "Contrato habitacional padrão. Inquilino responsável por utilidades.",
    createdAt: "2024-12-15T09:00:00Z",
    updatedAt: "2025-01-01T10:00:00Z",
  },
  {
    id: "demo-lease-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    tenantId: "demo-tenant-2",
    startDate: "2024-06-01",
    endDate: "2027-05-31",
    monthlyRent: 2800,
    securityDeposit: 5600,
    status: "active",
    terms: "Contrato comercial. Inquilino responsável por impostos, seguro e manutenção.",
    createdAt: "2024-05-20T10:30:00Z",
    updatedAt: "2024-06-01T09:00:00Z",
  },
  {
    id: "demo-lease-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    tenantId: "demo-tenant-3",
    startDate: "2025-03-01",
    endDate: "2026-02-28",
    monthlyRent: 1100,
    securityDeposit: 1100,
    status: "active",
    terms: "Contrato habitacional. Prazo de 1 ano com opção de renovação.",
    createdAt: "2025-02-10T12:00:00Z",
    updatedAt: "2025-03-01T08:00:00Z",
  },
  {
    id: "demo-lease-4",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-5",
    tenantId: "demo-tenant-4",
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    monthlyRent: 550,
    securityDeposit: 550,
    status: "active",
    terms: "Contrato habitacional para estudantes. 12 meses.",
    createdAt: "2025-08-15T10:00:00Z",
    updatedAt: "2025-09-01T08:00:00Z",
  },
] as unknown as Lease[];

// ── Receipts ───────────────────────────────────────────
export const DEMO_RECEIPTS: Receipt[] = [
  {
    id: "demo-receipt-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apartments",
    type: "rent",
    amount: 950,
    date: "2026-04-01",
    status: "paid",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "demo-receipt-2",
    userId: DEMO_USER_ID,
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
    id: "demo-receipt-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    propertyName: "Marina View Condo",
    type: "rent",
    amount: 1100,
    date: "2026-04-01",
    status: "pending",
    description: "Renda Abril 2026",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "demo-receipt-4",
    userId: DEMO_USER_ID,
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
    id: "demo-receipt-5",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    propertyName: "Sunset Apartments",
    type: "rent",
    amount: 950,
    date: "2026-03-01",
    status: "paid",
    description: "Renda Março 2026",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "demo-receipt-6",
    userId: DEMO_USER_ID,
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
] as unknown as Receipt[];

// ── Expenses ───────────────────────────────────────────
export const DEMO_EXPENSES: Expense[] = [
  {
    id: "demo-expense-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    category: "maintenance",
    amount: 180,
    date: "2026-03-15",
    description: "Reparação da canalização — cozinha",
    status: "paid",
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
    status: "paid",
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
    status: "paid",
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
    status: "paid",
    createdAt: "2026-02-20T16:00:00Z",
    updatedAt: "2026-02-21T09:00:00Z",
  },
  {
    id: "demo-expense-5",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-3",
    category: "maintenance",
    amount: 320,
    date: "2026-04-01",
    description: "Jardinagem e manutenção exterior",
    status: "pending",
    createdAt: "2026-04-01T11:00:00Z",
    updatedAt: "2026-04-01T11:00:00Z",
  },
] as unknown as Expense[];

// ── Maintenance Tickets ────────────────────────────────
export const DEMO_MAINTENANCE: MaintenanceTicket[] = [
  {
    id: "demo-maint-1",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-1",
    tenantId: "demo-tenant-1",
    title: "Torneira a pingar na casa de banho",
    description: "A torneira da casa de banho tem estado a pingar constantemente na última semana.",
    status: "in_progress",
    priority: "medium",
    reportedDate: "2026-04-01",
    images: "[]",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-04-02T14:00:00Z",
  },
  {
    id: "demo-maint-2",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-2",
    tenantId: "demo-tenant-2",
    title: "Sistema AVAC não arrefece",
    description: "A unidade de ar condicionado não produz ar frio no escritório.",
    status: "open",
    priority: "high",
    reportedDate: "2026-04-03",
    images: "[]",
    createdAt: "2026-04-03T09:00:00Z",
    updatedAt: "2026-04-03T09:00:00Z",
  },
  {
    id: "demo-maint-3",
    userId: DEMO_USER_ID,
    propertyId: "demo-prop-4",
    tenantId: "demo-tenant-3",
    title: "Vidro partido na sala de estar",
    description: "Vidro da janela rachado, necessita substituição.",
    status: "resolved",
    priority: "high",
    reportedDate: "2026-02-20",
    completedDate: "2026-02-25",
    images: "[]",
    createdAt: "2026-02-20T16:00:00Z",
    updatedAt: "2026-02-25T11:00:00Z",
  },
] as unknown as MaintenanceTicket[];

// ── Templates ──────────────────────────────────────────
export const DEMO_TEMPLATES: CorrespondenceTemplate[] = [
  {
    id: "demo-template-1",
    userId: DEMO_USER_ID,
    name: "Lembrete de Renda",
    subject: "Lembrete de Pagamento de Renda",
    body: "Caro(a) {{tenant_name}},\n\nEste é um lembrete amigável de que o pagamento da renda no valor de €{{amount}} é devido a {{due_date}}.\n\nObrigado,\nGestão do Imóvel",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "demo-template-2",
    userId: DEMO_USER_ID,
    name: "Aviso de Manutenção",
    subject: "Manutenção Programada",
    body: "Caro(a) {{tenant_name}},\n\nIremos realizar manutenção programada a {{date}}. Por favor, garanta acesso a {{area}}.\n\nCumprimentos,\nEquipa de Manutenção",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
] as unknown as CorrespondenceTemplate[];

// ── Correspondence ─────────────────────────────────────
export const DEMO_CORRESPONDENCE: Correspondence[] = [
  {
    id: "demo-corr-1",
    userId: DEMO_USER_ID,
    recipientEmail: "maria.silva@email.com",
    recipientName: "Maria Silva",
    subject: "Bem-vinda ao Sunset Apartments",
    body: "Cara Maria,\n\nBem-vinda ao Sunset Apartments! Estamos muito satisfeitos por tê-la como inquilina.\n\nCumprimentos,\nGestão do Imóvel",
    status: "sent",
    sentAt: "2025-01-01T12:00:00Z",
    createdAt: "2025-01-01T11:50:00Z",
    updatedAt: "2025-01-01T12:00:00Z",
  },
] as unknown as Correspondence[];

// ── Aggregated Demo Data ───────────────────────────────

export type DemoEntityType =
  | "properties"
  | "tenants"
  | "receipts"
  | "templates"
  | "correspondence"
  | "owners"
  | "expenses"
  | "maintenance"
  | "leases"
  | "contacts";

const DEMO_DATA_MAP: Record<DemoEntityType, unknown[]> = {
  properties: DEMO_PROPERTIES,
  tenants: DEMO_TENANTS,
  receipts: DEMO_RECEIPTS,
  templates: DEMO_TEMPLATES,
  correspondence: DEMO_CORRESPONDENCE,
  owners: DEMO_OWNERS,
  expenses: DEMO_EXPENSES,
  maintenance: DEMO_MAINTENANCE,
  leases: DEMO_LEASES,
  contacts: [], // Maintenance contacts — use from existing mock if needed
};

/**
 * Get demo data for a given entity type. Returns a deep copy.
 */
export function getDemoData<T = unknown>(entityType: DemoEntityType): T[] {
  const data = DEMO_DATA_MAP[entityType];
  if (!data) return [];
  return JSON.parse(JSON.stringify(data)) as T[];
}

/**
 * Get a single demo entity by ID. Returns a deep copy or null.
 */
export function getDemoDataById<T extends { id: string }>(
  entityType: DemoEntityType,
  id: string,
): T | null {
  const data = DEMO_DATA_MAP[entityType] as T[];
  const item = data.find((d) => d.id === id);
  return item ? (JSON.parse(JSON.stringify(item)) as T) : null;
}
