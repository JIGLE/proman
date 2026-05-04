-- Expand MaintenanceTicket model: add category, estimatedCost, scheduledDate, dueDate,
-- vendorName, vendorPhone, invoiceRef, isTenantReport fields (ticket 2.1)

ALTER TABLE "maintenance_tickets" ADD COLUMN "category" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "estimatedCost" REAL;
ALTER TABLE "maintenance_tickets" ADD COLUMN "scheduledDate" DATETIME;
ALTER TABLE "maintenance_tickets" ADD COLUMN "dueDate" DATETIME;
ALTER TABLE "maintenance_tickets" ADD COLUMN "vendorName" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "vendorPhone" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "invoiceRef" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "isTenantReport" BOOLEAN NOT NULL DEFAULT false;
