-- Product-analytics event sink + server-side onboarding dismissal
-- (docs/PRODUCT_AUDIT_2026.md §9 and §3): the app had no in-app product
-- analytics, and onboarding-checklist dismissal was localStorage-only (lost
-- across browsers/devices, unmeasurable).

ALTER TABLE "user_settings" ADD COLUMN "onboardingDismissedAt" DATETIME;

CREATE TABLE "product_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "product_events_userId_name_idx" ON "product_events"("userId", "name");
CREATE INDEX "product_events_createdAt_idx" ON "product_events"("createdAt");
