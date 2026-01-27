-- AlterTable: Add SendGrid webhook tracking fields to email_logs
ALTER TABLE "email_logs" ADD COLUMN "sendgridMessageId" TEXT UNIQUE;
ALTER TABLE "email_logs" ADD COLUMN "lastEventType" TEXT;
ALTER TABLE "email_logs" ADD COLUMN "lastEventAt" DATETIME;
ALTER TABLE "email_logs" ADD COLUMN "failureReason" TEXT;

-- Make userId optional (nullable) for webhook-initiated logs
ALTER TABLE "email_logs" RENAME TO "email_logs_old";

CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "sendgridMessageId" TEXT UNIQUE,
    "lastEventType" TEXT,
    "lastEventAt" DATETIME,
    "failureReason" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "email_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "email_logs" ("id", "userId", "to", "from", "subject", "templateId", "status", "messageId", "error", "sentAt", "createdAt", "updatedAt") 
  SELECT "id", "userId", "to", "from", "subject", "templateId", "status", "messageId", "error", "sentAt", "createdAt", "updatedAt" 
  FROM "email_logs_old";

DROP TABLE "email_logs_old";

-- Create indexes for query performance
CREATE INDEX "email_logs_to_idx" ON "email_logs"("to");
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");
