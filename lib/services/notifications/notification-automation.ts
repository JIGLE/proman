/**
 * Notification Automation Service
 *
 * Automated triggers for:
 * - Rent payment reminders (D-5 before due date)
 * - Overdue payment notices (D+1 and D+7)
 * - Lease renewal reminders (D-60 before expiration)
 * - Recibo de Renda deadline reminders (D+5 after payment, PT only)
 *
 * Designed to be called from a cron endpoint (e.g., /api/cron/notifications)
 */

import { getPrismaClient } from "@/lib/services/database/database";
import { logger } from "@/lib/utils/logger";

const log = logger.child("notification-automation");

interface AutomationResult {
  rentReminders: number;
  overdueNotices: number;
  leaseRenewals: number;
  receiptReminders: number;
  errors: string[];
}

/**
 * Generate rent payment reminders for invoices due in 5 days
 */
async function generateRentReminders(
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<number> {
  const now = new Date();
  const fiveDaysFromNow = new Date(now);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const startOfTargetDay = new Date(fiveDaysFromNow);
  startOfTargetDay.setHours(0, 0, 0, 0);
  const endOfTargetDay = new Date(fiveDaysFromNow);
  endOfTargetDay.setHours(23, 59, 59, 999);

  // Find invoices due in 5 days that don't already have a reminder notification
  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { gte: startOfTargetDay, lte: endOfTargetDay },
      status: "pending",
    },
    include: {
      tenant: true,
      property: true,
    },
  });

  let created = 0;
  for (const invoice of upcomingInvoices) {
    // Check if a reminder was already created for this invoice
    const existing = await prisma.notification.findFirst({
      where: {
        userId: invoice.userId,
        type: "payment_due",
        entityType: "Invoice",
        entityId: invoice.id,
      },
    });
    if (existing) continue;

    const tenantName = invoice.tenant?.name ?? "Tenant";
    const propertyAddr = invoice.property?.address ?? "Property";

    await prisma.notification.create({
      data: {
        userId: invoice.userId,
        type: "payment_due",
        title: `Rent payment due in 5 days`,
        message: `Payment of €${invoice.amount.toFixed(2)} from ${tenantName} for ${propertyAddr} is due on ${invoice.dueDate.toLocaleDateString("pt-PT")}.`,
        entityType: "Invoice",
        entityId: invoice.id,
      },
    });
    created++;
  }
  return created;
}

/**
 * Generate overdue payment notices (D+1 and D+7)
 */
async function generateOverdueNotices(
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<number> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Invoices past due date and still pending
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { lt: today },
      status: "pending",
    },
    include: {
      tenant: true,
      property: true,
    },
  });

  let created = 0;
  for (const invoice of overdueInvoices) {
    const daysPastDue = Math.floor(
      (today.getTime() - new Date(invoice.dueDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Only send at D+1 and D+7
    if (daysPastDue !== 1 && daysPastDue !== 7) continue;

    const suffix = daysPastDue === 1 ? "1 day" : "7 days";

    // Check if this specific overdue notice was already sent
    const existing = await prisma.notification.findFirst({
      where: {
        userId: invoice.userId,
        type: "payment_overdue",
        entityType: "Invoice",
        entityId: invoice.id,
        message: { contains: suffix },
      },
    });
    if (existing) continue;

    const tenantName = invoice.tenant?.name ?? "Tenant";
    const propertyAddr = invoice.property?.address ?? "Property";

    await prisma.notification.create({
      data: {
        userId: invoice.userId,
        type: "payment_overdue",
        title: `Payment overdue by ${suffix}`,
        message: `Payment of €${invoice.amount.toFixed(2)} from ${tenantName} for ${propertyAddr} is overdue by ${suffix}.`,
        entityType: "Invoice",
        entityId: invoice.id,
      },
    });
    created++;
  }
  return created;
}

/**
 * Generate lease renewal reminders (D-60 before expiration)
 */
async function generateLeaseRenewalReminders(
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<number> {
  const now = new Date();
  const sixtyDaysFromNow = new Date(now);
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const startOfTargetDay = new Date(sixtyDaysFromNow);
  startOfTargetDay.setHours(0, 0, 0, 0);
  const endOfTargetDay = new Date(sixtyDaysFromNow);
  endOfTargetDay.setHours(23, 59, 59, 999);

  const expiringLeases = await prisma.lease.findMany({
    where: {
      endDate: { gte: startOfTargetDay, lte: endOfTargetDay },
      status: "active",
    },
    include: {
      tenant: true,
      property: true,
    },
  });

  let created = 0;
  for (const lease of expiringLeases) {
    // Check if reminder already sent
    const existing = await prisma.notification.findFirst({
      where: {
        userId: lease.userId,
        type: "lease_renewal_reminder",
        entityType: "Lease",
        entityId: lease.id,
      },
    });
    if (existing) continue;

    const tenantName = lease.tenant?.name ?? "Tenant";
    const propertyAddr = lease.property?.address ?? "Property";

    await prisma.notification.create({
      data: {
        userId: lease.userId,
        type: "lease_renewal_reminder",
        title: "Lease expiring in 60 days",
        message: `Lease for ${tenantName} at ${propertyAddr} expires on ${lease.endDate.toLocaleDateString("pt-PT")}. Consider renewal or sending notice.`,
        entityType: "Lease",
        entityId: lease.id,
      },
    });
    created++;
  }
  return created;
}

/**
 * Generate Recibo de Renda deadline reminders (Portugal only)
 * Portuguese law requires rent receipts within 5 days of payment.
 * This triggers a reminder for payments received 4 days ago without a receipt.
 */
async function generateReceiptDeadlineReminders(
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<number> {
  const now = new Date();
  const fourDaysAgo = new Date(now);
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  const startOfTargetDay = new Date(fourDaysAgo);
  startOfTargetDay.setHours(0, 0, 0, 0);
  const endOfTargetDay = new Date(fourDaysAgo);
  endOfTargetDay.setHours(23, 59, 59, 999);

  // Find payments from 4 days ago that don't have a rent receipt yet
  const payments = await prisma.paymentTransaction.findMany({
    where: {
      status: "succeeded",
      createdAt: { gte: startOfTargetDay, lte: endOfTargetDay },
    },
    include: {
      tenant: {
        include: {
          property: true,
        },
      },
    },
  });

  let created = 0;
  for (const payment of payments) {
    if (!payment.tenant?.property) continue;

    // Only for Portuguese properties (check country or tax regime)
    const country = (payment.tenant.property.country ?? "").toUpperCase();
    const isPortugueseProperty = country === "PT" || country === "PORTUGAL";
    if (!isPortugueseProperty) continue;

    // Check if a rent receipt already exists for this payment
    const receiptExists = await prisma.rentReceipt.findFirst({
      where: {
        tenantId: payment.tenantId,
        propertyId: payment.tenant.property.id,
        paymentDate: {
          gte: startOfTargetDay,
          lte: endOfTargetDay,
        },
      },
    });
    if (receiptExists) continue;

    // Check if reminder already sent
    const existing = await prisma.notification.findFirst({
      where: {
        userId: payment.tenant.userId,
        type: "rent_receipt_due",
        entityType: "PaymentTransaction",
        entityId: payment.id,
      },
    });
    if (existing) continue;

    const tenantName = payment.tenant.name ?? "Tenant";
    const propertyAddr = payment.tenant.property.address ?? "Property";

    await prisma.notification.create({
      data: {
        userId: payment.tenant.userId,
        type: "rent_receipt_due",
        title: "Recibo de renda deadline tomorrow",
        message: `A rent receipt for ${tenantName} at ${propertyAddr} (payment of €${payment.amount.toFixed(2)}) must be issued by tomorrow to meet the 5-day legal deadline.`,
        entityType: "PaymentTransaction",
        entityId: payment.id,
      },
    });
    created++;
  }
  return created;
}

/**
 * Run all automated notification checks.
 * Call this from a cron endpoint (daily at ~08:00 local time recommended).
 */
export async function runNotificationAutomation(): Promise<AutomationResult> {
  const prisma = getPrismaClient();
  const errors: string[] = [];
  let rentReminders = 0;
  let overdueNotices = 0;
  let leaseRenewals = 0;
  let receiptReminders = 0;

  try {
    rentReminders = await generateRentReminders(prisma);
  } catch (e) {
    const msg = `Rent reminders failed: ${(e as Error).message}`;
    log.error(msg);
    errors.push(msg);
  }

  try {
    overdueNotices = await generateOverdueNotices(prisma);
  } catch (e) {
    const msg = `Overdue notices failed: ${(e as Error).message}`;
    log.error(msg);
    errors.push(msg);
  }

  try {
    leaseRenewals = await generateLeaseRenewalReminders(prisma);
  } catch (e) {
    const msg = `Lease renewal reminders failed: ${(e as Error).message}`;
    log.error(msg);
    errors.push(msg);
  }

  try {
    receiptReminders = await generateReceiptDeadlineReminders(prisma);
  } catch (e) {
    const msg = `Receipt deadline reminders failed: ${(e as Error).message}`;
    log.error(msg);
    errors.push(msg);
  }

  const result = {
    rentReminders,
    overdueNotices,
    leaseRenewals,
    receiptReminders,
    errors,
  };
  log.info("Notification automation completed", result);
  return result;
}
