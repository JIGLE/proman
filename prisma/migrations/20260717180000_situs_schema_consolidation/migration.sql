-- Situs Schema Consolidation (PR 11)
-- Drops a superseded field now that its replacement is fully wired, and
-- adds an index the bank movements inbox needs at real query volumes.
--
-- Changes:
--   1. Drop Expense.receiptImage — superseded by Expense.documentId (Migration
--      A / PR 9's document-linking UI). No remaining reads or writes anywhere
--      in the app (verified before this migration was written).
--   2. Add bank_transactions(userId, bookingDate) — the movements inbox list
--      (GET /api/bank/transactions) filters by userId alone (no status) and
--      sorts by bookingDate; only [userId, status] and [bankAccountId,
--      bookingDate] existed, neither covers that query shape.
--
-- Tenant.paymentStatus's manual write path was closed in application code
-- this same PR (the API route no longer accepts it) — no schema change
-- needed, the column stays derived-only going forward.

ALTER TABLE "expenses" DROP COLUMN "receiptImage";

CREATE INDEX "bank_transactions_userId_bookingDate_idx" ON "bank_transactions"("userId", "bookingDate");
