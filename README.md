[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/JIGLE/ProMan/actions/workflows/ci.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/ci.yml)
[![Security Scan](https://github.com/JIGLE/ProMan/actions/workflows/security-scan.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/security-scan.yml)
[![Deploy to GHCR](https://github.com/JIGLE/ProMan/actions/workflows/deploy-ghcr.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/deploy-ghcr.yml)

# ProMan — Property Management Dashboard

Lightweight, self-hosted property management built with **Next.js**, **Prisma**, and **SQLite**. Includes Playwright E2E tests, Docker/Helm packaging, and TrueNAS SCALE support.

## Quick Start (Development)

```bash
npm install
cp .env.example .env   # edit as needed
npm run dev
```

Open http://localhost:3000

## Quick Start (Docker)

```bash
# Build and run locally
docker build -t proman:local .
docker run --rm -p 3000:3000 -e NODE_ENV=production proman:local

# Or use Docker Compose
docker-compose --profile prod up -d    # production (GHCR image)
docker-compose --profile dev up -d     # development (build from source)
```

## Testing

```bash
npm test                # Unit tests (Vitest)
npm run test:coverage   # With coverage report
npm run test:e2e        # E2E tests (Playwright)
npm run lint            # ESLint
npm run type-check      # TypeScript check
```

## Key Environment Variables

| Variable          | Required    | Description                                  |
| ----------------- | ----------- | -------------------------------------------- |
| `DATABASE_URL`    | Yes (prod)  | SQLite path, e.g. `file:/data/proman.sqlite` |
| `NEXTAUTH_URL`    | Yes (prod)  | Public URL of the application                |
| `NEXTAUTH_SECRET` | Yes (prod)  | Session signing secret (min 32 chars)        |
| `INIT_SECRET`     | Recommended | Protects the DB init endpoint                |

See [.env.example](.env.example) for the complete list with defaults and documentation.

### Feature Flags (opt-in)

| Flag              | Default | Enables                 |
| ----------------- | ------- | ----------------------- |
| `ENABLE_STRIPE`   | `false` | Stripe payments         |
| `ENABLE_SENDGRID` | `false` | SendGrid email delivery |
| `ENABLE_OAUTH`    | `false` | Google OAuth login      |

## Deployment

- **Docker**: [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml)
- **Kubernetes**: [k8s/](k8s/) manifests with probes and resource limits
- **Helm**: [helm/proman/](helm/proman/) with TrueNAS values
- **TrueNAS SCALE**: See [TrueNAS Guide](docs/truenas.md)

Full deployment instructions: [docs/deployment.md](docs/deployment.md)

## Database Initialization

After first deploy, initialize the schema:

```bash
curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" \
  http://localhost:3000/api/debug/db/init | jq
```

See [Database Strategy](docs/DATABASE_STRATEGY.md) for migrations, backups, and production guidance.

## Helper Scripts

| Script                    | Description                        |
| ------------------------- | ---------------------------------- |
| `scripts/build-image.sh`  | Build Docker image with build args |
| `scripts/helm-package.sh` | Package Helm chart                 |
| `scripts/init-db.sh`      | Initialize database via API        |
| `scripts/db-backup.sh`    | Backup SQLite database             |

## Documentation

- **[Documentation Index](docs/README.md)** — links to all available guides
- [Deployment Guide](docs/deployment.md)
- [TrueNAS SCALE Guide](docs/truenas.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Security Guide](docs/SECURITY.md)
- [Database Strategy](docs/DATABASE_STRATEGY.md)
- [Metrics & Monitoring](docs/METRICS_AND_MONITORING.md)

## Webhook & Release Notifications

ProMan supports in-app update notifications. Set `UPDATE_WEBHOOK_SECRET` and `UPDATE_WEBHOOK_URL` to enable secure webhook notifications from CI/CD. See [docs/SECURITY.md](docs/SECURITY.md) for HMAC enforcement details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Windows Development Notes

- Use forward slashes in `DATABASE_URL`: `file:./dev.db` (not backslashes)
- SQLite binaries are compiled during `npm install` — ensure build tools are available (Visual Studio Build Tools or `windows-build-tools`)
- PowerShell equivalents for bash scripts are available (or use Git Bash / WSL)
- Line endings: the repo uses `.gitattributes` to normalize; if you see issues, run `git config core.autocrlf true`

## Support

Issues & discussions: https://github.com/JIGLE/proman

## License

[MIT](LICENSE)

```



```
