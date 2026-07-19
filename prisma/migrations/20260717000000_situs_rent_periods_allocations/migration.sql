-- Situs Migration A — the reference-month period ledger.
--
-- Adds the two models the allocation engine (lib/services/allocation) plugs
-- into, plus additive columns on receipts / audit_logs / expenses. The
-- REFERENCE month (what a payment is FOR) becomes a first-class, queryable
-- fact — the spine of the Rent Matrix and property Current Period Status.
-- All changes are additive; legacy Receipt rows self-backfill via defaults
-- (lifecycle='emitted', source='manual').
--
-- Note: columns added via ALTER TABLE on SQLite cannot carry FK constraints;
-- referential behavior for receipts.rentPeriodId and expenses.documentId is
-- enforced at the Prisma layer (as with prior hand-written migrations).

-- The period ledger: one row per lease per reference month.
CREATE TABLE "rent_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "dueAmount" REAL NOT NULL,
    "allocatedAmount" REAL NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rent_periods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rent_periods_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rent_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rent_periods_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "rent_periods_leaseId_year_month_key" ON "rent_periods"("leaseId", "year", "month");
CREATE INDEX "rent_periods_userId_year_month_idx" ON "rent_periods"("userId", "year", "month");
CREATE INDEX "rent_periods_leaseId_status_idx" ON "rent_periods"("leaseId", "status");
CREATE INDEX "rent_periods_propertyId_year_idx" ON "rent_periods"("propertyId", "year");
CREATE INDEX "rent_periods_tenantId_status_idx" ON "rent_periods"("tenantId", "status");

-- Money → reference-month join. Reversals are soft (reversedAt) so the audit
-- history survives. Bank/online-payment source columns arrive with the bank
-- layer migration; a manual Receipt is the first supported source.
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rentPeriodId" TEXT NOT NULL,
    "receiptId" TEXT,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'rent',
    "allocatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "reversedAt" DATETIME,
    "reversalReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_allocations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_allocations_rentPeriodId_fkey" FOREIGN KEY ("rentPeriodId") REFERENCES "rent_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payment_allocations_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "payment_allocations_userId_idx" ON "payment_allocations"("userId");
CREATE INDEX "payment_allocations_rentPeriodId_idx" ON "payment_allocations"("rentPeriodId");
CREATE INDEX "payment_allocations_receiptId_idx" ON "payment_allocations"("receiptId");

-- Receipt: document lifecycle (distinct from the money `status`) + period link.
ALTER TABLE "receipts" ADD COLUMN "rentPeriodId" TEXT;
ALTER TABLE "receipts" ADD COLUMN "referenceMonth" TEXT;
ALTER TABLE "receipts" ADD COLUMN "lifecycle" TEXT NOT NULL DEFAULT 'emitted';
ALTER TABLE "receipts" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
CREATE INDEX "receipts_rentPeriodId_idx" ON "receipts"("rentPeriodId");
CREATE INDEX "receipts_lifecycle_idx" ON "receipts"("lifecycle");

-- AuditLog: anchor entries to a record so per-entity audit trails are one query.
ALTER TABLE "audit_logs" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "resourceId" TEXT;
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- Expense: real Document link + tax review state (receiptImage stays, deprecated).
ALTER TABLE "expenses" ADD COLUMN "documentId" TEXT;
ALTER TABLE "expenses" ADD COLUMN "taxReviewStatus" TEXT;
CREATE INDEX "expenses_documentId_idx" ON "expenses"("documentId");
