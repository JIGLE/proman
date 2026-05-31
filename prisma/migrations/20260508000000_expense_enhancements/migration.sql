-- Expense model enhancements: unit/lease scoping, tax deductibility, vendor info for OCR
-- RedefineTables
PRAGMA foreign_keys=OFF;

ALTER TABLE "expenses" ADD COLUMN "unitId" TEXT;
ALTER TABLE "expenses" ADD COLUMN "leaseId" TEXT;
ALTER TABLE "expenses" ADD COLUMN "isDeductible" BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE "expenses" ADD COLUMN "vendorName" TEXT;
ALTER TABLE "expenses" ADD COLUMN "vendorVat" TEXT;

-- Create new performance indexes
CREATE INDEX "expenses_unitId_idx" ON "expenses"("unitId");
CREATE INDEX "expenses_leaseId_idx" ON "expenses"("leaseId");
CREATE INDEX "expenses_isDeductible_idx" ON "expenses"("isDeductible");

PRAGMA foreign_keys=ON;
