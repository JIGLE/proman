# Migration: Add `Unit` and `Lease` models

This document describes the recommended steps to introduce the new `Unit` and `Lease` models into the production schema and backfill data from the existing `Property`/`Tenant` layout.

## Overview

- We added `Unit` and `Lease` models to `prisma/schema.prisma` (non-destructive). The goal is to model buildings/units separately from `Property` and to create canonical `Lease` records instead of storing lease dates on the `Tenant` row.

## Important notes

- These schema changes require a Prisma migration and regenerating the Prisma client before server code that references `prisma.unit` or `prisma.lease` is executed.
- Backfilling must be done carefully and within transactions to avoid data loss.

## Recommended migration steps (dev / staging)

1. Commit schema changes to a feature branch.
2. On your development machine (or staging), run:

```bash
npx prisma migrate dev --name add-unit-lease
npx prisma generate
```

3. Run the backfill script (see Backfill below) against staging to create `Unit` rows and `Lease` rows derived from current `Property`/`Tenant` data.
4. Run your test-suite and smoke tests.
5. Open a PR with schema + backfill script + migration and request review.

## Production deployment

1. Merge PR to `main`.
2. Deploy a release that contains the migration but does not yet reference `unit`/`lease` in runtime code (or deploy with feature flag disabled).
3. Run `npx prisma migrate deploy` in the production environment to apply schema changes.
4. Run the backfill job once (see Backfill below) to populate `units` and `leases`.
5. Deploy application code that starts using the new models.

## Backfill plan (example script outline)

- Goal: for each `Tenant` that represents a leased unit, create a `Unit` (if none exists) and a `Lease` for the tenant with `startDate`/`endDate` set from `tenant.leaseStart`/`tenant.leaseEnd`.
- Run inside a transaction per tenant to avoid partial writes.

Pseudo-SQL (illustrative):

```sql
BEGIN;
INSERT INTO units (id, userId, propertyId, unitNumber, rent, status, createdAt, updatedAt)
  SELECT gen_random_uuid(), t.userId, t.propertyId, NULL, t.rent, 'occupied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM tenants t
  WHERE NOT EXISTS(SELECT 1 FROM units u WHERE u.propertyId = t.propertyId /* refine condition */);

INSERT INTO leases (id, userId, unitId, tenantId, startDate, endDate, rent, status, createdAt, updatedAt)
  SELECT gen_random_uuid(), t.userId, u.id, t.id, t.leaseStart, t.leaseEnd, t.rent, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM tenants t
  JOIN units u ON u.propertyId = t.propertyId /* refine match to target unit */;

COMMIT;
```

Be careful: the join condition must be tailored to your data to avoid creating duplicate/misassigned units. Consider running small batches and verifying results.

## Testing & verification

- Run full unit and integration test suites after `prisma generate`.
- Verify that UI flows show the expected unit/lease data and that old fields on `Tenant` are still readable (we keep them for backward compatibility until code migrates).

## Rollbacks

- If migration fails, use `prisma migrate resolve` to mark migrations applied/rolled back and follow your DB backup/restore procedures.

## Next steps

- Implement services and endpoints for `Unit` and `Lease` (CRUD, listing, assignment). Start with read-only endpoints in UI to pilot usage.
- Replace usage of `tenant.leaseStart/leaseEnd` incrementally with `Lease` references.
- Update reports and tax logic to pull rent/lease periods from `Lease` when available.
