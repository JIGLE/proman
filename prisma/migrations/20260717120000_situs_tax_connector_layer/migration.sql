-- Situs Migration C — the tax connector layer.
--
-- TaxAuthorityConnector + TaxSubmissionLog back the receipt lifecycle state
-- machine (lib/services/receipts/lifecycle.ts) and the PT connector wrapper
-- (lib/tax/connectors/pt-at.ts). Mode defaults to 'review': every submission
-- routes through human review until a user explicitly promotes a connector
-- to 'live'. TaxSubmissionLog is append-only — the audit trail a future
-- Tax Connector dashboard reads.
--
-- Also additive: rent_receipts gains rentPeriodId/receiptId back-links to
-- the reference-month ledger and the lifecycle-managed Receipt that
-- triggered its emission (both nullable — legacy rows are unaffected).

CREATE TABLE "tax_authority_connectors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "connectorKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'review',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSubmissionAt" DATETIME,
    "credentialsRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tax_authority_connectors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tax_authority_connectors_userId_connectorKey_key" ON "tax_authority_connectors"("userId", "connectorKey");
CREATE INDEX "tax_authority_connectors_userId_idx" ON "tax_authority_connectors"("userId");

CREATE TABLE "tax_submission_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" TEXT,
    "responseBody" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_submission_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_submission_logs_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "tax_authority_connectors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "tax_submission_logs_userId_idx" ON "tax_submission_logs"("userId");
CREATE INDEX "tax_submission_logs_connectorId_idx" ON "tax_submission_logs"("connectorId");
CREATE INDEX "tax_submission_logs_subjectType_subjectId_idx" ON "tax_submission_logs"("subjectType", "subjectId");

-- Additive columns on rent_receipts. SQLite ALTER cannot carry FK
-- constraints; referential behavior is enforced at the Prisma layer, as with
-- prior hand-written migrations in this repo.
ALTER TABLE "rent_receipts" ADD COLUMN "rentPeriodId" TEXT;
ALTER TABLE "rent_receipts" ADD COLUMN "receiptId" TEXT;

CREATE INDEX "rent_receipts_rentPeriodId_idx" ON "rent_receipts"("rentPeriodId");
CREATE INDEX "rent_receipts_receiptId_idx" ON "rent_receipts"("receiptId");
