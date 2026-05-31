-- Sprint 4: Add propertyId to correspondence (ticket 4.3) and actualCost to maintenance_tickets (ticket 4.5)

ALTER TABLE "correspondence" ADD COLUMN "propertyId" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "actualCost" REAL;
