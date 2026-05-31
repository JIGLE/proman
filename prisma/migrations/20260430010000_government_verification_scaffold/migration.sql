-- Government verification scaffold
-- Adds provider-agnostic identity and property ownership verification tables.

CREATE TABLE "government_verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalReference" TEXT,
    "verifiedFullName" TEXT,
    "verifiedTaxId" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" DATETIME,
    "completedAt" DATETIME,
    "expiresAt" DATETIME,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "government_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "property_verification_claims" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verificationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "claimType" TEXT NOT NULL DEFAULT 'ownership',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ownershipPercentage" REAL,
    "sourceReference" TEXT,
    "matchedAddress" TEXT,
    "registryData" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "property_verification_claims_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "government_verifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "property_verification_claims_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "government_verifications_userId_status_idx" ON "government_verifications"("userId", "status");
CREATE INDEX "government_verifications_provider_status_idx" ON "government_verifications"("provider", "status");
CREATE INDEX "property_verification_claims_propertyId_status_idx" ON "property_verification_claims"("propertyId", "status");
CREATE INDEX "property_verification_claims_verificationId_idx" ON "property_verification_claims"("verificationId");
CREATE UNIQUE INDEX "property_verification_claims_verificationId_propertyId_key" ON "property_verification_claims"("verificationId", "propertyId");