-- Migration: Iberian Compliance (PT + ES)
-- Adds models for Ley de Vivienda stressed zones, NRUA contract registry,
-- and Portuguese Recibos de Renda Eletrónicos.
-- Also extends Lease and Property with Iberian-specific compliance fields.
-- Adds new NotificationType values for automation.

-- ─── New Enum Values ────────────────────────────────────────────────────────

-- NotificationType: add payment_overdue, rent_receipt_due, nrua_registration,
-- lease_renewal_reminder
-- PostgreSQL ALTER TYPE ADD VALUE is used for enum extensions.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'payment_overdue'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'payment_overdue';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'rent_receipt_due'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'rent_receipt_due';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'nrua_registration'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'nrua_registration';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'lease_renewal_reminder'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'lease_renewal_reminder';
  END IF;
END $$;

-- ─── New Enum Types ──────────────────────────────────────────────────────────

-- NRUAContractType
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NRUAContractType') THEN
    CREATE TYPE "NRUAContractType" AS ENUM (
      'primary_residence',
      'temporary_housing',
      'tourist_rental'
    );
  END IF;
END $$;

-- NRUAStatus
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NRUAStatus') THEN
    CREATE TYPE "NRUAStatus" AS ENUM (
      'pending',
      'submitted',
      'registered',
      'rejected'
    );
  END IF;
END $$;

-- RentReceiptStatus
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentReceiptStatus') THEN
    CREATE TYPE "RentReceiptStatus" AS ENUM (
      'draft',
      'issued',
      'submitted',
      'cancelled'
    );
  END IF;
END $$;

-- ─── New Tables ───────────────────────────────────────────────────────────────

-- StressedZone (Spain Ley de Vivienda 12/2023)
CREATE TABLE IF NOT EXISTS "stressed_zones" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "municipalityCode"  TEXT NOT NULL,
    "region"            TEXT NOT NULL,
    "declaredAt"        TIMESTAMP(3) NOT NULL,
    "expiresAt"         TIMESTAMP(3),
    "maxRentIncrease"   DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "description"       TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stressed_zones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stressed_zones_userId_idx" ON "stressed_zones"("userId");
CREATE INDEX IF NOT EXISTS "stressed_zones_municipalityCode_idx" ON "stressed_zones"("municipalityCode");

-- NRUARegistration (Spain Ventanilla Única Digital – mandatory from 2026)
CREATE TABLE IF NOT EXISTS "nrua_registrations" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "leaseId"           TEXT NOT NULL,
    "registrationNumber" TEXT,
    "contractType"      "NRUAContractType" NOT NULL DEFAULT 'primary_residence',
    "status"            "NRUAStatus" NOT NULL DEFAULT 'pending',
    "cadasterReference" TEXT NOT NULL,
    "municipalityCode"  TEXT NOT NULL,
    "landlordNif"       TEXT NOT NULL,
    "tenantNif"         TEXT NOT NULL,
    "submittedAt"       TIMESTAMP(3),
    "confirmedAt"       TIMESTAMP(3),
    "xmlPayload"        TEXT,
    "responsePayload"   TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nrua_registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "nrua_registrations_userId_idx" ON "nrua_registrations"("userId");
CREATE INDEX IF NOT EXISTS "nrua_registrations_leaseId_idx" ON "nrua_registrations"("leaseId");
CREATE INDEX IF NOT EXISTS "nrua_registrations_status_idx" ON "nrua_registrations"("status");

-- RentReceipt (Portugal Recibos de Renda Eletrónicos – mandatory AT submission)
CREATE TABLE IF NOT EXISTS "rent_receipts" (
    "id"                    TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "leaseId"               TEXT NOT NULL,
    "receiptNumber"         TEXT NOT NULL,
    "status"                "RentReceiptStatus" NOT NULL DEFAULT 'draft',
    "landlordNif"           TEXT NOT NULL,
    "tenantNif"             TEXT NOT NULL,
    "rentAmount"            DOUBLE PRECISION NOT NULL,
    "withholdingAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDate"           TIMESTAMP(3) NOT NULL,
    "rentalPeriodStart"     TIMESTAMP(3) NOT NULL,
    "rentalPeriodEnd"       TIMESTAMP(3) NOT NULL,
    "issuedAt"              TIMESTAMP(3),
    "submittedToATAt"       TIMESTAMP(3),
    "xmlPayload"            TEXT,
    "atConfirmationCode"    TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rent_receipts_receiptNumber_key" ON "rent_receipts"("receiptNumber");
CREATE INDEX IF NOT EXISTS "rent_receipts_userId_idx" ON "rent_receipts"("userId");
CREATE INDEX IF NOT EXISTS "rent_receipts_leaseId_idx" ON "rent_receipts"("leaseId");
CREATE INDEX IF NOT EXISTS "rent_receipts_status_idx" ON "rent_receipts"("status");

-- ─── Alter Existing Tables ────────────────────────────────────────────────────

-- leases: add Iberian compliance columns
ALTER TABLE "leases"
    ADD COLUMN IF NOT EXISTS "isRendaAcessivel"  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isZonaTensionada"  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "priorContractRent" DOUBLE PRECISION;

-- properties: add Spanish cadastral reference and stressed-zone flag
ALTER TABLE "properties"
    ADD COLUMN IF NOT EXISTS "isZonaTensionada"  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "cadasterReference" TEXT;

-- ─── Foreign Key Constraints ─────────────────────────────────────────────────

ALTER TABLE "nrua_registrations"
    ADD CONSTRAINT IF NOT EXISTS "nrua_registrations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nrua_registrations"
    ADD CONSTRAINT IF NOT EXISTS "nrua_registrations_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rent_receipts"
    ADD CONSTRAINT IF NOT EXISTS "rent_receipts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rent_receipts"
    ADD CONSTRAINT IF NOT EXISTS "rent_receipts_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stressed_zones"
    ADD CONSTRAINT IF NOT EXISTS "stressed_zones_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
