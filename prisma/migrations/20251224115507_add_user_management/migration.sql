/*
  Warnings:

  - Added the required column `userId` to the `correspondence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `receipts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_correspondence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "correspondence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "correspondence_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "correspondence_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "correspondence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_correspondence" ("content", "createdAt", "id", "sentAt", "status", "subject", "templateId", "tenantId", "updatedAt") SELECT "content", "createdAt", "id", "sentAt", "status", "subject", "templateId", "tenantId", "updatedAt" FROM "correspondence";
DROP TABLE "correspondence";
ALTER TABLE "new_correspondence" RENAME TO "correspondence";
CREATE TABLE "new_properties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "rent" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_properties" ("address", "bathrooms", "bedrooms", "createdAt", "description", "id", "image", "name", "rent", "status", "type", "updatedAt") SELECT "address", "bathrooms", "bedrooms", "createdAt", "description", "id", "image", "name", "rent", "status", "type", "updatedAt" FROM "properties";
DROP TABLE "properties";
ALTER TABLE "new_properties" RENAME TO "properties";
CREATE TABLE "new_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "receipts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_receipts" ("amount", "createdAt", "date", "description", "id", "propertyId", "status", "tenantId", "type", "updatedAt") SELECT "amount", "createdAt", "date", "description", "id", "propertyId", "status", "tenantId", "type", "updatedAt" FROM "receipts";
DROP TABLE "receipts";
ALTER TABLE "new_receipts" RENAME TO "receipts";
CREATE TABLE "new_tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "propertyId" TEXT,
    "rent" REAL NOT NULL,
    "leaseStart" DATETIME NOT NULL,
    "leaseEnd" DATETIME NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastPayment" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenants_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tenants" ("createdAt", "email", "id", "lastPayment", "leaseEnd", "leaseStart", "name", "notes", "paymentStatus", "phone", "propertyId", "rent", "updatedAt") SELECT "createdAt", "email", "id", "lastPayment", "leaseEnd", "leaseStart", "name", "notes", "paymentStatus", "phone", "propertyId", "rent", "updatedAt" FROM "tenants";
DROP TABLE "tenants";
ALTER TABLE "new_tenants" RENAME TO "tenants";
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
