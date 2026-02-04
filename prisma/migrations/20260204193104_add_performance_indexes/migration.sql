-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "bankName" TEXT,
    "iban" TEXT,
    "ibanLast4" TEXT,
    "bic" TEXT,
    "accountHolder" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PT',
    "multibancoEntity" TEXT,
    "multibancoReference" TEXT,
    "mbwayPhone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentMethodId" TEXT,
    "invoiceId" TEXT,
    "tenantId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "multibancoEntity" TEXT,
    "multibancoReference" TEXT,
    "multibancoExpiresAt" DATETIME,
    "mbwayRequestId" TEXT,
    "sepaMandateId" TEXT,
    "sepaDebitDate" DATETIME,
    "processedAt" DATETIME,
    "failedAt" DATETIME,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "refundedAmount" REAL,
    "refundedAt" DATETIME,
    "refundReason" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payment_transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payment_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "maintenance_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "company" TEXT,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialties" TEXT NOT NULL,
    "hourlyRate" REAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "rating" REAL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "income_distributions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "taxMode" TEXT NOT NULL,
    "totalIncome" REAL NOT NULL,
    "totalExpenses" REAL NOT NULL,
    "netIncome" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedByUserId" TEXT NOT NULL,
    "recalculatedByUserId" TEXT,
    "recalculatedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "income_distributions_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "income_distribution_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownershipPercentage" REAL NOT NULL,
    "grossShare" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "netShare" REAL NOT NULL,
    "taxCountry" TEXT,
    "taxRate" REAL,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "income_distribution_shares_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "income_distributions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "income_distribution_shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultTaxCountry" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "taxReminderNotifications" BOOLEAN NOT NULL DEFAULT true,
    "distributionNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "sendgridMessageId" TEXT,
    "lastEventType" TEXT,
    "lastEventAt" DATETIME,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "email_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_email_logs" ("createdAt", "error", "failureReason", "from", "id", "lastEventAt", "lastEventType", "messageId", "sendgridMessageId", "sentAt", "status", "subject", "templateId", "to", "updatedAt", "userId") SELECT "createdAt", "error", "failureReason", "from", "id", "lastEventAt", "lastEventType", "messageId", "sendgridMessageId", "sentAt", "status", "subject", "templateId", "to", "updatedAt", "userId" FROM "email_logs";
DROP TABLE "email_logs";
ALTER TABLE "new_email_logs" RENAME TO "email_logs";
CREATE UNIQUE INDEX "email_logs_sendgridMessageId_key" ON "email_logs"("sendgridMessageId");
CREATE TABLE "new_maintenance_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "images" TEXT NOT NULL,
    "cost" REAL,
    "assignedTo" TEXT,
    "assignedContactId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "maintenance_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_tickets_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "maintenance_tickets_assignedContactId_fkey" FOREIGN KEY ("assignedContactId") REFERENCES "maintenance_contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_maintenance_tickets" ("assignedTo", "cost", "createdAt", "description", "id", "images", "priority", "propertyId", "resolvedAt", "status", "tenantId", "title", "updatedAt", "userId") SELECT "assignedTo", "cost", "createdAt", "description", "id", "images", "priority", "propertyId", "resolvedAt", "status", "tenantId", "title", "updatedAt", "userId" FROM "maintenance_tickets";
DROP TABLE "maintenance_tickets";
ALTER TABLE "new_maintenance_tickets" RENAME TO "maintenance_tickets";
CREATE INDEX "maintenance_tickets_userId_idx" ON "maintenance_tickets"("userId");
CREATE INDEX "maintenance_tickets_propertyId_idx" ON "maintenance_tickets"("propertyId");
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets"("status");
CREATE INDEX "maintenance_tickets_priority_idx" ON "maintenance_tickets"("priority");
CREATE INDEX "maintenance_tickets_userId_status_idx" ON "maintenance_tickets"("userId", "status");
CREATE TABLE "new_owners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "role" TEXT NOT NULL DEFAULT 'REGULAR',
    "taxResidenceCountry" TEXT,
    "taxIdentificationNumber" TEXT,
    "taxRate" REAL,
    "portalAccess" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_owners" ("address", "createdAt", "email", "id", "name", "notes", "phone", "updatedAt", "userId") SELECT "address", "createdAt", "email", "id", "name", "notes", "phone", "updatedAt", "userId" FROM "owners";
DROP TABLE "owners";
ALTER TABLE "new_owners" RENAME TO "owners";
CREATE UNIQUE INDEX "owners_email_key" ON "owners"("email");
CREATE TABLE "new_properties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "streetAddress" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'Portugal',
    "latitude" REAL,
    "longitude" REAL,
    "addressVerified" BOOLEAN NOT NULL DEFAULT false,
    "buildingId" TEXT,
    "buildingName" TEXT,
    "type" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "rent" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "incomeSplitMode" TEXT NOT NULL DEFAULT 'POST_TAX',
    "distributionFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdByOwnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_properties" ("address", "addressVerified", "bathrooms", "bedrooms", "buildingId", "buildingName", "city", "country", "createdAt", "description", "id", "image", "latitude", "longitude", "name", "rent", "status", "streetAddress", "type", "updatedAt", "userId", "zipCode") SELECT "address", "addressVerified", "bathrooms", "bedrooms", "buildingId", "buildingName", "city", "country", "createdAt", "description", "id", "image", "latitude", "longitude", "name", "rent", "status", "streetAddress", "type", "updatedAt", "userId", "zipCode" FROM "properties";
DROP TABLE "properties";
ALTER TABLE "new_properties" RENAME TO "properties";
CREATE INDEX "properties_userId_idx" ON "properties"("userId");
CREATE INDEX "properties_status_idx" ON "properties"("status");
CREATE INDEX "properties_userId_status_idx" ON "properties"("userId", "status");
CREATE TABLE "new_property_owners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownershipPercentage" REAL NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REGULAR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "property_owners_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "property_owners_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_property_owners" ("createdAt", "id", "ownerId", "ownershipPercentage", "propertyId", "updatedAt") SELECT "createdAt", "id", "ownerId", "ownershipPercentage", "propertyId", "updatedAt" FROM "property_owners";
DROP TABLE "property_owners";
ALTER TABLE "new_property_owners" RENAME TO "property_owners";
CREATE UNIQUE INDEX "property_owners_propertyId_ownerId_key" ON "property_owners"("propertyId", "ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "payment_transactions_invoiceId_idx" ON "payment_transactions"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_transactions_tenantId_idx" ON "payment_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "expenses_propertyId_idx" ON "expenses"("propertyId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "receipts_userId_idx" ON "receipts"("userId");

-- CreateIndex
CREATE INDEX "receipts_propertyId_idx" ON "receipts"("propertyId");

-- CreateIndex
CREATE INDEX "receipts_tenantId_idx" ON "receipts"("tenantId");

-- CreateIndex
CREATE INDEX "receipts_status_idx" ON "receipts"("status");

-- CreateIndex
CREATE INDEX "receipts_date_idx" ON "receipts"("date");

-- CreateIndex
CREATE INDEX "receipts_userId_status_date_idx" ON "receipts"("userId", "status", "date");

-- CreateIndex
CREATE INDEX "tenants_userId_idx" ON "tenants"("userId");

-- CreateIndex
CREATE INDEX "tenants_propertyId_idx" ON "tenants"("propertyId");

-- CreateIndex
CREATE INDEX "tenants_paymentStatus_idx" ON "tenants"("paymentStatus");

-- CreateIndex
CREATE INDEX "tenants_userId_paymentStatus_idx" ON "tenants"("userId", "paymentStatus");
