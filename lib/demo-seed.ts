import { getPrismaClient } from "./services/database";
import {
  PropertyType,
  PropertyStatus,
  PaymentStatus,
  ReceiptType,
  ReceiptStatus,
  MaintenanceStatus,
  MaintenancePriority,
} from "@prisma/client";

export async function seedDemoData(userId: string): Promise<void> {
  const prisma = getPrismaClient();

  // 1. Clean existing records for the sandbox user
  // Defensive: some developer DBs may be missing migrations/tables. Don't crash the API.
  const safeDelete = async (action: () => Promise<unknown>, name: string) => {
    try {
      await action();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[seeder] Skipping ${name} cleanup: ${msg}`);
    }
  };

  await safeDelete(() => prisma.receipt.deleteMany({ where: { userId } }), "receipts");
  await safeDelete(() => prisma.expense.deleteMany({ where: { userId } }), "expenses");
  await safeDelete(
    () => prisma.maintenanceTicket.deleteMany({ where: { userId } }),
    "maintenanceTickets",
  );
  await safeDelete(() => prisma.correspondence.deleteMany({ where: { userId } }), "correspondence");
  await safeDelete(
    () => prisma.propertyOwner.deleteMany({ where: { property: { userId } } }),
    "propertyOwners",
  );
  await safeDelete(() => prisma.tenant.deleteMany({ where: { userId } }), "tenants");
  await safeDelete(() => prisma.property.deleteMany({ where: { userId } }), "properties");
  await safeDelete(() => prisma.owner.deleteMany({ where: { userId } }), "owners");

  console.log(`[seeder] Cleared available demo data for user: ${userId}`);

  // 2. Create Owners
  const owner = await prisma.owner.create({
    data: {
      userId,
      name: "Prime Realty Holdings LLC",
      email: "holdings@primerealty.com",
      phone: "+351 912 345 678",
      address: "Avenida da Liberdade 120, 1250-144 Lisbon",
      notes: "Primary corporate vehicle for Lisbon and Porto holdings.",
    },
  });

  // 3. Create Properties (buildings grouped by address)
  const propertiesData = [
    {
      name: "Apartment 3A",
      address: "Av. da Liberdade 120, Lisbon",
      countryCode: "PT",
      propertyTaxClass: "residential",
      type: "apartment" as PropertyType,
      bedrooms: 2,
      bathrooms: 1,
      rent: 1500,
      status: "occupied" as PropertyStatus,
      description: "Charming 2-bed apartment with balcony views over Av. da Liberdade.",
    },
    {
      name: "Penthouse B",
      address: "Av. da Liberdade 120, Lisbon",
      countryCode: "PT",
      propertyTaxClass: "residential",
      type: "apartment" as PropertyType,
      bedrooms: 3,
      bathrooms: 2,
      rent: 3200,
      status: "occupied" as PropertyStatus,
      description: "Luxury 3-bedroom penthouse with terrace and private pool access.",
    },
    {
      name: "Apt 1B",
      address: "Av. da Liberdade 120, Lisbon",
      countryCode: "PT",
      propertyTaxClass: "residential",
      type: "apartment" as PropertyType,
      bedrooms: 1,
      bathrooms: 1,
      rent: 1100,
      status: "vacant" as PropertyStatus,
      description: "Cozy 1-bedroom flat, newly renovated kitchen.",
    },
    {
      name: "Ground Floor Retail",
      address: "Rua de Santa Catarina 45, Porto",
      countryCode: "PT",
      propertyTaxClass: "commercial",
      type: "other" as PropertyType,
      bedrooms: 0,
      bathrooms: 1,
      rent: 2200,
      status: "occupied" as PropertyStatus,
      description: "Prime retail storefront in high foot-traffic district.",
    },
    {
      name: "Studio 201",
      address: "Rua de Santa Catarina 45, Porto",
      countryCode: "PT",
      propertyTaxClass: "residential",
      type: "apartment" as PropertyType,
      bedrooms: 1,
      bathrooms: 1,
      rent: 850,
      status: "maintenance" as PropertyStatus,
      description: "Studio unit under scheduled floor restoration.",
    },
    {
      name: "Suite 404",
      address: "Calle de Alcalá 14, Madrid",
      countryCode: "ES",
      propertyTaxClass: "residential",
      type: "condo" as PropertyType,
      bedrooms: 2,
      bathrooms: 2,
      rent: 1800,
      status: "occupied" as PropertyStatus,
      description: "Modern condo near Puerta del Sol.",
    },
  ];

  const dbProperties = [];
  for (const p of propertiesData) {
    const prop = await prisma.property.create({
      data: {
        userId,
        ...p,
      },
    });
    dbProperties.push(prop);

    // Link ownership
    await prisma.propertyOwner.create({
      data: {
        propertyId: prop.id,
        ownerId: owner.id,
        ownershipPercentage: 100.0,
      },
    });
  }

  // 4. Create Tenants
  const tenantsData = [
    {
      name: "João Silva",
      email: "joao.silva@outlook.pt",
      phone: "+351 933 222 111",
      rent: 1500,
      leaseStart: "2025-01-01",
      leaseEnd: "2026-12-31", // 24 months
      paymentStatus: "paid" as PaymentStatus,
      notes: "Portuguese national, prompt payer. Preferred communication: Email.",
      propertyIndex: 0, // Apartment 3A
    },
    {
      name: "Sophia Dubois",
      email: "s.dubois@gmail.com",
      phone: "+33 6 1234 5678",
      rent: 3200,
      leaseStart: "2025-06-01",
      leaseEnd: "2028-05-31", // 36 months
      paymentStatus: "paid" as PaymentStatus,
      notes: "Expats from France. Clean credit history.",
      propertyIndex: 1, // Penthouse B
    },
    {
      name: "Carlos Gómez",
      email: "carlos.g@gomez-retail.es",
      phone: "+34 600 112 233",
      rent: 2200,
      leaseStart: "2024-01-01",
      leaseEnd: "2029-12-31", // 72 months -> Long commercial/long-term lease
      paymentStatus: "paid" as PaymentStatus,
      notes: "Boutique clothing store tenant. Highly stable income stream.",
      propertyIndex: 3, // Ground Floor Retail
    },
    {
      name: "Ana Martínez",
      email: "ana.martinez@gmail.com",
      phone: "+34 677 889 900",
      rent: 1800,
      leaseStart: "2025-03-01",
      leaseEnd: "2026-02-28", // 12 months -> Short lease
      paymentStatus: "overdue" as PaymentStatus,
      notes: "Rent is late by 5 days for May 2026. Friendly rent reminders queued.",
      propertyIndex: 5, // Suite 404
    },
  ];

  const dbTenants = [];
  for (const t of tenantsData) {
    const prop = dbProperties[t.propertyIndex];

    const tenant = await prisma.tenant.create({
      data: {
        userId,
        name: t.name,
        email: t.email,
        phone: t.phone,
        rent: t.rent,
        leaseStart: new Date(t.leaseStart),
        leaseEnd: new Date(t.leaseEnd),
        paymentStatus: t.paymentStatus,
        notes: t.notes,
        propertyId: prop.id,
      },
    });
    dbTenants.push(tenant);
  }

  // 5. Create Receipts (Income)
  const receiptsData = [
    // João Silva (Jan - May 2026)
    {
      tenantIndex: 0,
      propertyIndex: 0,
      date: "2026-01-05",
      amount: 1500,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 0,
      propertyIndex: 0,
      date: "2026-02-05",
      amount: 1500,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 0,
      propertyIndex: 0,
      date: "2026-03-05",
      amount: 1500,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 0,
      propertyIndex: 0,
      date: "2026-04-05",
      amount: 1500,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 0,
      propertyIndex: 0,
      date: "2026-05-05",
      amount: 1500,
      type: "rent" as ReceiptType,
    },

    // Sophia Dubois (Jan - May 2026)
    {
      tenantIndex: 1,
      propertyIndex: 1,
      date: "2026-01-01",
      amount: 3200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 1,
      propertyIndex: 1,
      date: "2026-02-01",
      amount: 3200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 1,
      propertyIndex: 1,
      date: "2026-03-01",
      amount: 3200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 1,
      propertyIndex: 1,
      date: "2026-04-01",
      amount: 3200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 1,
      propertyIndex: 1,
      date: "2026-05-01",
      amount: 3200,
      type: "rent" as ReceiptType,
    },

    // Carlos Gómez (Jan - May 2026)
    {
      tenantIndex: 2,
      propertyIndex: 3,
      date: "2026-01-02",
      amount: 2200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 2,
      propertyIndex: 3,
      date: "2026-02-02",
      amount: 2200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 2,
      propertyIndex: 3,
      date: "2026-03-02",
      amount: 2200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 2,
      propertyIndex: 3,
      date: "2026-04-02",
      amount: 2200,
      type: "rent" as ReceiptType,
    },
    {
      tenantIndex: 2,
      propertyIndex: 3,
      date: "2026-05-02",
      amount: 2200,
      type: "rent" as ReceiptType,
    },
  ];

  for (const r of receiptsData) {
    const tenant = dbTenants[r.tenantIndex];
    const prop = dbProperties[r.propertyIndex];

    await prisma.receipt.create({
      data: {
        userId,
        tenantId: tenant.id,
        propertyId: prop.id,
        amount: r.amount,
        date: new Date(r.date),
        type: r.type,
        status: "paid" as ReceiptStatus,
      },
    });
  }

  // 6. Create Expenses (Outflows)
  const expensesData = [
    {
      propertyIndex: 0,
      category: "Repairs",
      amount: 450,
      date: "2026-02-12",
      description: "Plumbing repair in Apartment 3A bathroom.",
    },
    {
      propertyIndex: 1,
      category: "Insurance",
      amount: 980,
      date: "2026-01-15",
      description: "Annual landlord building insurance package.",
    },
    {
      propertyIndex: 3,
      category: "Maintenance",
      amount: 350,
      date: "2026-03-10",
      description: "Air conditioning cleaning & filter swaps.",
    },
    {
      propertyIndex: 5,
      category: "Taxes",
      amount: 1200,
      date: "2026-04-01",
      description: "Madrid Local Property IBI Tax Payment.",
    },
    {
      propertyIndex: 0,
      category: "Mortgage Interest",
      amount: 800,
      date: "2026-05-01",
      description: "Monthly loan interest installment (Non-deductible category PT).",
    },
  ];

  for (const e of expensesData) {
    const prop = dbProperties[e.propertyIndex];

    await prisma.expense.create({
      data: {
        userId,
        propertyId: prop.id,
        amount: e.amount,
        date: new Date(e.date),
        category: e.category,
        description: e.description,
      },
    });
  }

  // 7. Create Maintenance Tickets
  const maintenanceData = [
    {
      propertyIndex: 0,
      tenantIndex: 0,
      title: "AC leak in master bedroom",
      description:
        "Water dripping from the wall split AC unit during operation. Needs HVAC inspection.",
      status: "in_progress" as MaintenanceStatus,
      priority: "high" as MaintenancePriority,
    },
    {
      propertyIndex: 5,
      tenantIndex: 3,
      title: "Loose front door handle",
      description:
        "Front door lock cylinder and handle are slightly loose. Hard to lock from inside.",
      status: "open" as MaintenanceStatus,
      priority: "medium" as MaintenancePriority,
    },
    {
      propertyIndex: 2,
      tenantIndex: null,
      title: "Scheduled painting prep",
      description:
        "Standard cosmetic wall prep and white painting layer for Apt 1B before renting.",
      status: "resolved" as MaintenanceStatus,
      priority: "low" as MaintenancePriority,
    },
  ];

  for (const m of maintenanceData) {
    const prop = dbProperties[m.propertyIndex];
    const tenant = m.tenantIndex !== null ? dbTenants[m.tenantIndex] : null;

    await prisma.maintenanceTicket.create({
      data: {
        userId,
        propertyId: prop.id,
        tenantId: tenant ? tenant.id : null,
        title: m.title,
        description: m.description,
        status: m.status,
        priority: m.priority,
        images: "[]",
      },
    });
  }

  console.log(`[seeder] Successfully seeded mock data workspace for demo-user: ${userId}`);
}
