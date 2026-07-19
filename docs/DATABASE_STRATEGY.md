# Database Strategy

This document covers ProMan's database approach, migration workflow, backup/recovery
procedures, and — per `docs/DEVELOPMENT_ROADMAP.md` item 3.5 — the storage/scale plan:
what would actually force a move off SQLite, and what that move would look like.
Relationship to other docs: `docs/PRODUCT_AUDIT_2026.md` §4 first flagged the two
concrete scale risks this doc plans against (contract-file BLOBs, load-everything
client state); this doc is where the plan for those risks lives.

## SQLite vs Server-based Database

ProMan uses **SQLite** by default for simplicity and self-hosted deployments. For production at scale, consider migrating to PostgreSQL or MySQL.

| Aspect            | SQLite                     | PostgreSQL               |
| ----------------- | -------------------------- | ------------------------ |
| Setup complexity  | Zero — single file         | Requires separate server |
| Concurrent writes | Limited (single writer)    | Full concurrency         |
| Backup            | File copy                  | `pg_dump` or streaming   |
| Scaling           | Single node only           | Horizontal read replicas |
| Recommended for   | Single-tenant, low traffic | Multi-tenant, production |

**This is a deliberate choice, not a gap.** SQLite-by-default is core to ProMan's
self-hosted positioning: zero external dependencies, one file to back up, runs on a
Raspberry Pi or a TrueNAS SCALE box with no separate DB server to operate. The plan
below is to keep that default and treat PostgreSQL as an opt-in path for a specific,
scale-triggered scenario (e.g. a future hosted/managed offering) — not to migrate
every deployment.

## Current Scale Risks

Two concrete risks, both real today, neither urgent yet:

1. **`Lease.contractFile` stores signed PDF contracts as a `Bytes` BLOB directly in the
   database row** (`prisma/schema.prisma`, `Lease` model). Every contract upload grows
   the single SQLite file, which then has to move through every backup, every `.backup`
   copy, and every WAL checkpoint. It's the only BLOB field in the schema —
   `Document.storagePath` (used for everything else: insurance policies, certificates,
   correspondence attachments) already does this correctly, storing a filesystem path or
   URL instead of bytes. `Lease.contractFile` predates that pattern and was never
   migrated to match it.
2. **`lib/contexts/use-app-data.ts` loads ten full, unpaginated collections
   (`/api/properties`, `/api/buildings`, `/api/tenants`, `/api/receipts`,
   `/api/correspondence/templates`, `/api/correspondence`, `/api/owners`,
   `/api/expenses`, `/api/maintenance`, `/api/leases`) in parallel on every app mount**,
   regardless of portfolio size. `/api/properties` already supports `?page=`/`?limit=`
   (see `app/api/properties/route.ts`) but this caller doesn't use it — it always hits
   the "return everything" branch. This is a client-side/API-shape problem, not a
   database-engine problem: it would still be slow against PostgreSQL. Fixing it means
   paginating these fetches and/or moving from "load everything into a global reducer on
   mount" to per-view fetching, independent of whichever database engine is underneath.

Neither risk is urgent at today's likely portfolio sizes (a handful to a few dozen
properties per landlord). Both compound linearly with usage, so they're worth planning
for, not fixing reactively under load.

## When to Migrate to PostgreSQL

Don't migrate speculatively. Move when any of these is true for a real deployment:

- **A hosted/managed offering ships** (see roadmap 3.4's monetization work) — multiple
  landlords' data on one running instance means concurrent writes across tenants, which
  is exactly where SQLite's single-writer model starts to queue requests. Self-hosted
  single-tenant instances don't hit this; a shared hosted instance eventually will.
- **The SQLite file crosses roughly 5–10 GB**, driven mostly by `Lease.contractFile`
  BLOBs at scale (a few thousand contracts at typical PDF sizes). At that size, `.backup`
  duration, WAL growth, and cold-start file-existence/writability checks in
  `lib/services/database/database.ts` start to matter operationally.
- **A single instance needs to survive a node failure with no downtime.** SQLite has no
  built-in replication; PostgreSQL does. If uptime SLAs matter more than "self-hosted
  simplicity," that's a PostgreSQL-shaped requirement.

If none of these apply, the right move is to keep SQLite and fix the two risks above
independently of any engine change (see the next section) — they're cheaper, safer, and
benefit every deployment including ones that never move to PostgreSQL.

## Migration Path (SQLite → PostgreSQL), When Triggered

Prisma's `datasource.provider` is a single value per schema — `prisma/schema.prisma`
currently pins `provider = "sqlite"` (line ~10), and
`lib/services/database/database.ts` hard-constructs a `PrismaBetterSqlite3` adapter.
Supporting both engines from one codebase (self-hosted stays SQLite, a hosted offering
runs PostgreSQL) requires:

1. **A provider-aware Prisma client construction.** Branch `getPrismaClient()` on
   `DATABASE_URL`'s scheme (`file:` → `PrismaBetterSqlite3`, `postgres(ql)?:` → the
   Postgres driver adapter) instead of hard-coding one adapter. Prisma 7's driver-adapter
   model supports this; it does not require duplicating `schema.prisma`.
2. **Reconciling the migration history.** `prisma/migrations/20260308000000_iberian_compliance/`
   already contains Postgres-only SQL (`DOUBLE PRECISION`, `pg_enum`/`DO $$` blocks for
   enum extension, `ADD CONSTRAINT IF NOT EXISTS`) — evidence the project ran on
   PostgreSQL at some point before settling on SQLite-by-default. That migration breaks
   `prisma migrate deploy` replayed from empty on SQLite today (found during roadmap
   milestone 1.3; tracked as a known, currently-unfixed issue, out of scope for this
   plan). Actually adopting PostgreSQL means either fixing that migration for both
   engines or, more realistically, generating a fresh baseline migration per engine from
   the current schema rather than trying to replay the full mixed-syntax history.
3. **Moving `Lease.contractFile` off BLOB storage first**, regardless of engine — same
   `storagePath` pattern as `Document`. This should happen before any Postgres migration,
   not as part of it: it's the change that actually shrinks the data being moved, and it
   benefits every SQLite deployment immediately.
4. **A one-time data migration tool**, not a schema migration: read every row via the
   SQLite Prisma client, write it via the Postgres Prisma client, in dependency order
   (respecting FKs). `pgloader` can do direct SQLite→Postgres conversion for simple
   schemas, but this schema's PII-encrypted fields (`lib/services/database/pii-extension.ts`)
   and `Bytes` fields make an application-level Prisma-to-Prisma copy safer — it goes
   through the same encryption extension both ways instead of moving ciphertext blindly.
5. **Keeping SQLite as the documented, supported self-hosted default.** PostgreSQL
   support should be additive (an alternate `DATABASE_URL`), not a replacement — anything
   that makes self-hosting harder undermines the product's own positioning.

### Development: `prisma db push`

Use `prisma db push` during active development when the schema is changing frequently:

```bash
npx prisma db push
```

This directly applies schema changes to the database **without creating migration files**. It may drop data if changes are destructive.

### Production: `prisma migrate deploy`

For production, use **tracked migrations** to ensure reproducible, auditable schema changes:

```bash
# 1. Create a migration (development)
npx prisma migrate dev --name add_payment_status

# 2. Review the generated SQL in prisma/migrations/<timestamp>_add_payment_status/

# 3. Deploy migrations (production/CI)
npx prisma migrate deploy
```

### Migration workflow

```
Development:
  prisma migrate dev    →  Creates migration SQL files
                        →  Applies to local DB
                        →  Generates Prisma Client

Production:
  prisma migrate deploy →  Applies pending migrations
                        →  Does NOT generate client (already in image)
```

### Transitioning from `db push` to migrations

If you've been using `db push` and want to switch to migrations:

```bash
# 1. Baseline the current schema (creates initial migration without applying)
npx prisma migrate dev --name baseline --create-only

# 2. Mark the migration as applied (since the DB already has this schema)
npx prisma migrate resolve --applied <migration-name>

# 3. From now on, use `prisma migrate dev` for new changes
```

### CI/CD integration

Update your Dockerfile or Helm chart to run migrations on startup:

```dockerfile
# In Dockerfile CMD or entrypoint
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

Or as a Kubernetes init container:

```yaml
initContainers:
  - name: migrate
    image: ghcr.io/jigle/proman:<version>
    command: ["npx", "prisma", "migrate", "deploy"]
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: proman-secrets
            key: DATABASE_URL
```

## Backup & Recovery

### SQLite backup

SQLite databases are single files, making backups straightforward.

**Using the backup script:**

```bash
bash scripts/db-backup.sh /data/proman.sqlite ./backups
```

**Manual backup:**

```bash
# Hot backup using sqlite3 .backup command (safe during writes)
sqlite3 /data/proman.sqlite ".backup '/backups/proman-$(date +%Y%m%d-%H%M%S).sqlite'"

# Simple file copy (only safe if app is stopped or using WAL mode)
cp /data/proman.sqlite /backups/proman-backup.sqlite
```

### Automated backups (CronJob)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: proman-backup
spec:
  schedule: "0 2 * * *" # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: alpine:latest
              command:
                - sh
                - -c
                - |
                  apk add --no-cache sqlite
                  BACKUP_FILE="/backups/proman-$(date +%Y%m%d-%H%M%S).sqlite"
                  sqlite3 /data/proman.sqlite ".backup '${BACKUP_FILE}'"
                  echo "Backup created: ${BACKUP_FILE}"
                  # Keep only last 7 days of backups
                  find /backups -name "proman-*.sqlite" -mtime +7 -delete
              volumeMounts:
                - name: proman-data
                  mountPath: /data
                  readOnly: true
                - name: backups
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: proman-data
              persistentVolumeClaim:
                claimName: proman-data
            - name: backups
              persistentVolumeClaim:
                claimName: proman-backups
```

### Recovery

```bash
# Stop the application
kubectl scale deployment proman --replicas=0

# Restore from backup
cp /backups/proman-20260208-020000.sqlite /data/proman.sqlite

# Restart
kubectl scale deployment proman --replicas=1
```

## Schema Reference

See `prisma/schema.prisma` for the full data model. Key models:

- `User` — authentication and user profiles
- `Property` — property listings
- `Tenant` — tenant records
- `Lease` — lease agreements
- `PaymentMethod` / `PaymentTransaction` — tenant rent-collection payments (Stripe)
- `Subscription` — the app's own SaaS plan/billing state (see roadmap 3.4)
- `Invoice` — generated invoices
