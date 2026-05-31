-- Migration: add_preferred_currency
-- Adds preferredCurrency column to users table (nullable, default 'USD')

ALTER TABLE "users" ADD COLUMN "preferredCurrency" TEXT DEFAULT 'USD';
