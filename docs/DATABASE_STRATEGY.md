# Database Strategy

This document covers ProMan's database approach, migration workflow, and backup/recovery procedures.

## SQLite vs Server-based Database

ProMan uses **SQLite** by default for simplicity and self-hosted deployments. For production at scale, consider migrating to PostgreSQL or MySQL.

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Setup complexity | Zero — single file | Requires separate server |
| Concurrent writes | Limited (single writer) | Full concurrency |
| Backup | File copy | `pg_dump` or streaming |
| Scaling | Single node only | Horizontal read replicas |
| Recommended for | Single-tenant, low traffic | Multi-tenant, production |

## Migration Strategy

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
  schedule: "0 2 * * *"  # Daily at 2 AM
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
- `Payment` — payment transactions
- `Invoice` — generated invoices
