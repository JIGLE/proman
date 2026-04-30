-- Production Schema Audit Migration
-- Removes redundant/dead-code fields and models, adds missing FK constraints.
-- 
-- Changes:
--   1. Drop Document.uploadedAt  (duplicate of createdAt)
--   2. Drop MaintenanceTicket.assignedContactId  (defined FK, never used in app)
--   3. Drop map_points table  (model completely unused in app code)
--   4. Recreate user_settings with proper FK to users (cascade delete)

-- 1. Remove uploadedAt from documents
ALTER TABLE "documents" DROP COLUMN "uploadedAt";

-- 2. Remove unused assignedContactId from maintenance_tickets
ALTER TABLE "maintenance_tickets" DROP COLUMN "assignedContactId";

-- 3. Drop unused MapPoint table
DROP TABLE IF EXISTS "map_points";

-- 4. Recreate user_settings with FK constraint to users
-- (SQLite does not support ADD CONSTRAINT on existing tables)
PRAGMA foreign_keys=off;

CREATE TABLE "user_settings_new" (
    "id"                        TEXT NOT NULL PRIMARY KEY,
    "userId"                    TEXT NOT NULL UNIQUE,
    "theme"                     TEXT NOT NULL DEFAULT 'system',
    "language"                  TEXT NOT NULL DEFAULT 'en',
    "defaultCurrency"           TEXT NOT NULL DEFAULT 'EUR',
    "defaultTaxCountry"         TEXT,
    "emailNotifications"        BOOLEAN NOT NULL DEFAULT true,
    "taxReminderNotifications"  BOOLEAN NOT NULL DEFAULT true,
    "distributionNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "user_settings_new" SELECT * FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "user_settings_new" RENAME TO "user_settings";

PRAGMA foreign_keys=on;
