[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/JIGLE/ProMan/actions/workflows/ci.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/ci.yml)
[![Security Scan](https://github.com/JIGLE/ProMan/actions/workflows/security-scan.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/security-scan.yml)
[![Deploy to GHCR](https://github.com/JIGLE/ProMan/actions/workflows/deploy-ghcr.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/deploy-ghcr.yml)

# ProMan — Property Management Dashboard

A modern, self-hosted property management platform for landlords, property managers, and small real-estate firms. Track properties, tenants, leases, receipts, expenses, maintenance tickets, and correspondence — all from a single dashboard with multi-language support.

## Features

- **Multi-property management** — properties, units, tenants, owners
- **Financial tracking** — receipts, expenses, invoices, payment matrix, tax compliance
- **Maintenance** — ticket creation, assignment, status tracking with image uploads
- **Leases & contracts** — lifecycle management with expiration alerts
- **Correspondence** — templates, bulk generation, email delivery (SendGrid)
- **Tenant self-service portal** — secure JWT-based access for tenants to view their data
- **Document management** — upload, categorize, template generation (HTML/PDF)
- **Insights dashboard** — occupancy, revenue, ROI analytics
- **Internationalization** — English, Spanish, Portuguese (next-intl)
- **Payment integrations** — Stripe, Bizum (opt-in)

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 15 (App Router, Turbopack)         |
| Language   | TypeScript (strict)                        |
| Database   | Prisma ORM + SQLite                        |
| Auth       | NextAuth.js (Google OAuth + Credentials)   |
| UI         | shadcn/ui + Tailwind CSS + Framer Motion   |
| Validation | Zod                                        |
| Testing    | Vitest (unit) + Playwright (E2E)           |
| Deployment | Docker / Kubernetes / Helm / TrueNAS SCALE |

## Quick Start

### Development

```bash
npm install
cp .env.example .env   # edit as needed
npm run dev
```

Open http://localhost:3000

### Docker

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

## Architecture

```
app/
  [locale]/        → i18n-aware pages (dashboard, settings)
  api/             → RESTful API routes (properties, tenants, receipts, …)
  auth/            → Sign-in / sign-out pages
  tenant-portal/   → Self-service tenant portal
components/
  features/        → Domain components (property, financial, document, …)
  layouts/         → Page layouts and navigation
  shared/          → Reusable components (confirmation dialogs, etc.)
  ui/              → shadcn/ui primitives
lib/
  contexts/        → React contexts (app state, CSRF, toast, currency)
  services/        → Database services, auth, payments, email
  schemas/         → Zod validation schemas
  middleware/      → CSRF, rate limiting, security headers
  utils/           → API client, error handling, currency, logger
prisma/            → Schema and migrations
```

## Configuration

### Required Environment Variables

| Variable          | Required    | Description                                  |
| ----------------- | ----------- | -------------------------------------------- |
| `DATABASE_URL`    | Yes (prod)  | SQLite path, e.g. `file:/app/data/proman.db` |
| `NEXTAUTH_URL`    | Yes (prod)  | Public URL of the application                |
| `NEXTAUTH_SECRET` | Yes (prod)  | Session signing secret (min 32 chars)        |
| `INIT_SECRET`     | Recommended | Protects the DB init and debug endpoints     |

See [.env.example](.env.example) for the complete list with defaults and documentation.

### Feature Flags (opt-in)

| Flag              | Default | Enables                 |
| ----------------- | ------- | ----------------------- |
| `ENABLE_STRIPE`   | `false` | Stripe payments         |
| `ENABLE_SENDGRID` | `false` | SendGrid email delivery |
| `ENABLE_OAUTH`    | `false` | Google OAuth login      |

## Deployment

| Target        | Resources                                                           |
| ------------- | ------------------------------------------------------------------- |
| Docker        | [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml) |
| Kubernetes    | [k8s/](k8s/) manifests with probes and resource limits              |
| Helm          | [helm/proman/](helm/proman/) with TrueNAS values                    |
| TrueNAS SCALE | [TrueNAS Guide](docs/truenas.md)                                    |

Full deployment instructions: [docs/deployment.md](docs/deployment.md)

## Database Initialization

The database schema is **automatically created on first startup** when the
container detects an empty SQLite database (controlled by `AUTO_DB_INIT`,
default: `true`). For manual initialization:

```bash
curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" \
  http://localhost:3000/api/debug/db/init | jq
```

See [Database Strategy](docs/DATABASE_STRATEGY.md) for migrations, backups, and production guidance.

## Security

- CSRF token protection on all state-changing requests
- Nonce-based Content Security Policy headers
- Rate limiting (in-memory + Redis)
- JWT session management with configurable expiration
- Debug endpoints require `INIT_SECRET` authentication
- SendGrid webhook signature verification

See [Security Guide](docs/SECURITY.md) for full details.

## Documentation

| Guide                                                  | Description                   |
| ------------------------------------------------------ | ----------------------------- |
| [Documentation Index](docs/README.md)                  | Links to all available guides |
| [Deployment Guide](docs/deployment.md)                 | Production setup instructions |
| [TrueNAS Guide](docs/truenas.md)                       | TrueNAS SCALE deployment      |
| [Troubleshooting](docs/troubleshooting.md)             | Common issues and fixes       |
| [Security Guide](docs/SECURITY.md)                     | Security architecture         |
| [Database Strategy](docs/DATABASE_STRATEGY.md)         | Migrations, backups           |
| [Metrics & Monitoring](docs/METRICS_AND_MONITORING.md) | Observability setup           |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
