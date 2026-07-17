-- Situs Migration D — the OCR sidecar.
--
-- DocumentExtraction is 1:1 with Document (documentId unique) so the hot
-- Document model stays untouched. "mock" is the only engine today — no live
-- OCR integration exists yet, same pattern as the bank/tax connector layers
-- (Migrations B/C): classify first, review always, live provider later.

CREATE TABLE "document_extractions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "engine" TEXT NOT NULL DEFAULT 'mock',
    "confidence" REAL,
    "extractedFields" TEXT,
    "suggestedType" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_extractions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_extractions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "document_extractions_documentId_key" ON "document_extractions"("documentId");
CREATE INDEX "document_extractions_userId_status_idx" ON "document_extractions"("userId", "status");
