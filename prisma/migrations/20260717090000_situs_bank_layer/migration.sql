-- Situs Migration B — the bank layer.
--
-- Five new tables backing the Bank Movements inbox and the matching engine
-- (lib/services/matching): connections (manual/CSV first; PSD2 later is a new
-- provider value, not a schema change), accounts, transactions, sync jobs and
-- reconciliation rules. All changes are additive — new tables only.
--
-- IBANs follow the repo PII pattern: AES-256-GCM ciphertext columns plus
-- SHA-256 hash columns so matching and dedupe never require decryption.
-- BankTransaction.fingerprint is UNIQUE: exact re-imports are rejected before
-- any matching runs (idempotent import).

CREATE TABLE "bank_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "institutionName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "consentId" TEXT,
    "consentExpiresAt" DATETIME,
    "consentScope" TEXT,
    "lastSyncAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "bank_connections_userId_idx" ON "bank_connections"("userId");

CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iban" TEXT,
    "ibanHash" TEXT,
    "ibanLast4" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "bank_accounts_connectionId_ibanHash_key" ON "bank_accounts"("connectionId", "ibanHash");
CREATE INDEX "bank_accounts_userId_idx" ON "bank_accounts"("userId");

CREATE TABLE "bank_sync_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'csv_import',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "stats" TEXT,
    "error" TEXT,
    CONSTRAINT "bank_sync_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_sync_jobs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "bank_sync_jobs_userId_idx" ON "bank_sync_jobs"("userId");
CREATE INDEX "bank_sync_jobs_connectionId_idx" ON "bank_sync_jobs"("connectionId");

CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "syncJobId" TEXT,
    "externalId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "bookingDate" DATETIME NOT NULL,
    "valueDate" DATETIME,
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "counterpartyIbanHash" TEXT,
    "reference" TEXT,
    "rawData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'imported',
    "suggestedLeaseId" TEXT,
    "matchConfidence" REAL,
    "matchReasons" TEXT,
    "duplicateOfId" TEXT,
    "receiptId" TEXT,
    "reversalOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_transactions_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "bank_sync_jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bank_transactions_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bank_transactions_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "bank_transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "bank_transactions_fingerprint_key" ON "bank_transactions"("fingerprint");
CREATE INDEX "bank_transactions_userId_status_idx" ON "bank_transactions"("userId", "status");
CREATE INDEX "bank_transactions_bankAccountId_bookingDate_idx" ON "bank_transactions"("bankAccountId", "bookingDate");
CREATE INDEX "bank_transactions_counterpartyIbanHash_idx" ON "bank_transactions"("counterpartyIbanHash");

CREATE TABLE "reconciliation_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timesApplied" INTEGER NOT NULL DEFAULT 0,
    "lastAppliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reconciliation_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "reconciliation_rules_userId_priority_idx" ON "reconciliation_rules"("userId", "priority");
