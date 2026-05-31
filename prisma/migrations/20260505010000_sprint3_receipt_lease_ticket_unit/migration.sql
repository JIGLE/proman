-- Sprint 3: Add leaseId to receipts (ticket 4.1) and unitId to maintenance_tickets (ticket 4.2)

ALTER TABLE "receipts" ADD COLUMN "leaseId" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "unitId" TEXT;
