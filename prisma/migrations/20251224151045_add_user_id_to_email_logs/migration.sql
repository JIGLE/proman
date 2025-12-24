/*
  Warnings:

  - Added the required column `updatedAt` to the `email_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `email_logs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "email_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_email_logs" ("error", "from", "id", "messageId", "sentAt", "status", "subject", "templateId", "to") SELECT "error", "from", "id", "messageId", "sentAt", "status", "subject", "templateId", "to" FROM "email_logs";
DROP TABLE "email_logs";
ALTER TABLE "new_email_logs" RENAME TO "email_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
