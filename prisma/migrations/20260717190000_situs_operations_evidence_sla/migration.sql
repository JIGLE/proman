-- Situs Operations subtabs (PR 10b-1): Evidence tab needs to know which tickets
-- require proof (photos already exist via MaintenanceTicket.images / the ticket
-- detail modal's Photos tab) and the Task Queue/Calendar tabs want an SLA due
-- date distinct from the existing scheduled/due dates for the underlying work.

ALTER TABLE "maintenance_tickets" ADD COLUMN "evidenceRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_tickets" ADD COLUMN "slaDueAt" DATETIME;
