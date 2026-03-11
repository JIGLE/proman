[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/JIGLE/ProMan/actions/workflows/ci.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/ci.yml)
[![Security Scan](https://github.com/JIGLE/ProMan/actions/workflows/security-scan.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/security-scan.yml)
[![Deploy to GHCR](https://github.com/JIGLE/ProMan/actions/workflows/deploy-ghcr.yml/badge.svg)](https://github.com/JIGLE/ProMan/actions/workflows/deploy-ghcr.yml)

# ProMan — Property Management Dashboard

A modern, self-hosted property management platform built for landlords and property managers in **Portugal and Spain**. Track properties, tenants, leases, receipts, expenses, maintenance, and correspondence with Iberian-focused tax and legal compliance tooling.

> **v1.4.0** — Production-ready baseline for the 2026 Portuguese and Spanish rental market. See [RELEASES.md](RELEASES.md) for the full changelog.

## Features

### Core

- **Multi-property management** — properties, units, tenants, owners with role-based access
- **Financial tracking** — receipts, expenses, invoices, payment matrix, income distribution
- **Maintenance** — ticket creation, assignment, status tracking with image uploads
- **Leases & contracts** — lifecycle management, expiration alerts, bilingual PDF templates
- **Correspondence** — templates, bulk generation, email delivery (SendGrid)
- **Tenant self-service portal** — secure JWT-based access for tenants
- **Document management** — upload, categorize, HTML/PDF generation
- **Insights dashboard** — occupancy, revenue, ROI analytics
- **Internationalization** — English, Portuguese, Spanish (236 keys, full parity)

### 🇵🇹 Portugal Compliance

- **Recibos de Renda Eletrónicos** — mandatory electronic rent receipts with AT-compatible XML payload generation, NIF validation, and 5-day deadline enforcement (`POST /api/compliance/rent-receipts`)
- **2026 IRS brackets** — 9 progressive brackets (13.25% → 48%) with Renda Acessível flat 10% rate for rents ≤ €2,300/month
- **SAF-T PT export** — RSA-SHA1 digital signature with invoice hash chain

### 🇪🇸 Spain Compliance

- **NRUA export workflow** — Ventanilla Única Digital payload generation and registration tracking for 2026 (`POST /api/compliance/nrua`)
- **Ley de Vivienda 12/2023** — rent cap validation, stressed-zone deductions (50/60/70/90% tiers), grandes tenedores detection
- **2026 IRPF brackets** — 6 progressive brackets (19% → 47%)

### Payments & Security

- **Payment integrations** — Stripe-backed card and SEPA Direct Debit flows are available when payment credentials are configured; Multibanco, MB WAY, and Bizum require additional provider/banking setup depending on region
- **SEPA Direct Debit** — full mandate lifecycle (create, list, cancel)
- **PII encryption** — AES-256-GCM field-level encryption for IBAN, NIF, and phone

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 16 (App Router)                    |
| Language   | TypeScript (strict)                        |
| Database   | Prisma ORM + **PostgreSQL**                |
| Auth       | NextAuth.js (Google OAuth + Credentials)   |
| UI         | shadcn/ui + Tailwind CSS v4 + Radix UI     |
| Validation | Zod                                        |
| Email      | SendGrid                                   |
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
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/proman \
  -e NEXTAUTH_SECRET=your-secret \
  proman:local

# Or use Docker Compose
docker-compose --profile prod up -d    # production (GHCR image)
docker-compose --profile dev up -d     # development (build from source)
```

## Testing

```bash
npm test                # Unit tests (Vitest) — current CI baseline: 37 files, 86 tests
npm run test:coverage   # With coverage report
npm run test:e2e        # E2E tests (Playwright)
npm run lint            # ESLint
npm run type-check      # TypeScript check
```

## Architecture

```
app/
  [locale]/           → i18n-aware pages (dashboard, settings)
  api/
    compliance/       → Rent receipts (PT), NRUA (ES), rent cap validation
    cron/             → Notification automation endpoint
    leases/           → Lease CRUD + bilingual template generation
    payments/         → SEPA DD mandates, Stripe webhooks
    tax/              → SAF-T PT export
    …                 → properties, tenants, invoices, etc.
  auth/               → Sign-in / sign-out pages
  tenant-portal/      → Self-service tenant portal
components/
  features/           → Domain components (property, financial, document, …)
  layouts/            → Page layouts and navigation
  shared/             → Reusable components (confirmation dialogs, etc.)
  ui/                 → shadcn/ui primitives
lib/
  compliance/         → Rent receipts PT, NRUA ES modules
  contexts/           → React contexts (app state, CSRF, toast, currency)
  services/           → Database, auth, payments, email, PDF, notifications
  schemas/            → Zod validation schemas
  middleware/         → CSRF, rate limiting, security headers
  tax/                → SAF-T PT generation
  utils/              → API client, PII encryption, logger, env validation
prisma/
  schema.prisma       → 27 models, 23 enums (PostgreSQL)
  migrations/         → All database migrations
k8s/                  → Deployment, Service, CronJob manifests
helm/proman/          → Helm chart with TrueNAS SCALE values
```

## Configuration

### Required Environment Variables

| Variable             | Required    | Description                                     |
| -------------------- | ----------- | ----------------------------------------------- |
| `DATABASE_URL`       | ✅ Yes      | PostgreSQL connection string                    |
| `NEXTAUTH_URL`       | ✅ Yes      | Public URL of the application                   |
| `NEXTAUTH_SECRET`    | ✅ Yes      | Session signing secret (min 32 chars)           |
| `INIT_SECRET`        | Recommended | Protects DB init and debug endpoints            |
| `CRON_SECRET`        | ✅ Yes      | Bearer token for `/api/cron/notifications`      |
| `PII_ENCRYPTION_KEY` | ✅ Prod     | 64-char hex key for AES-256-GCM PII encryption  |
| `ENABLE_DEMO_LOGIN`  | ✅ Prod     | Set `false` in production to disable demo login |

### Portugal-Specific (optional)

| Variable                  | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `SAFT_SIGNING_KEY_PATH`   | Path to RSA PEM key for SAF-T PT digital signing |
| `SAFT_CERTIFICATE_NUMBER` | AT software certificate number                   |

See [.env.example](.env.example) for the complete list.

### Feature Flags (opt-in)

| Flag                | Default | Enables                               |
| ------------------- | ------- | ------------------------------------- |
| `ENABLE_STRIPE`     | `false` | Stripe payments                       |
| `ENABLE_SENDGRID`   | `false` | SendGrid email delivery               |
| `ENABLE_OAUTH`      | `false` | Google OAuth login                    |
| `ENABLE_DEMO_LOGIN` | `true`  | Credentials demo login (disable prod) |

## Deployment

| Target        | Resources                                                           |
| ------------- | ------------------------------------------------------------------- |
| Docker        | [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml) |
| Kubernetes    | [k8s/](k8s/) — Deployment, Service, CronJob manifests               |
| Helm          | [helm/proman/](helm/proman/) with TrueNAS values                    |
| TrueNAS SCALE | [TrueNAS Guide](docs/truenas.md)                                    |

Full deployment instructions: [docs/deployment.md](docs/deployment.md)

### Notification Automation (CronJob)

Automated daily notifications (rent reminders, overdue notices, lease renewals, receipt deadlines) are triggered via `POST /api/cron/notifications`. In Kubernetes, apply the included CronJob manifest:

```bash
kubectl apply -f k8s/cronjob-notifications.yaml
```

The CronJob runs at 08:00 UTC and authenticates with `CRON_SECRET`.

## Database

ProMan uses **PostgreSQL** via Prisma ORM. Run migrations with:

```bash
npx prisma migrate deploy   # apply all pending migrations
npx prisma generate         # regenerate client after schema changes
```

See [Database Strategy](docs/DATABASE_STRATEGY.md) for migrations, backups, and production guidance.

## Security

- CSRF token protection on all state-changing requests
- Nonce-based Content Security Policy headers
- Rate limiting (in-memory + Redis)
- JWT session management with configurable expiration
- AES-256-GCM PII encryption for sensitive fields (IBAN, NIF, phone)
- Debug endpoints require `INIT_SECRET` authentication
- SendGrid webhook signature verification
- `ENABLE_DEMO_LOGIN=false` kill switch for production

See [Security Guide](docs/SECURITY.md) for full details.

## Documentation

| Guide                                                  | Description                    |
| ------------------------------------------------------ | ------------------------------ |
| [Documentation Index](docs/README.md)                  | Links to all available guides  |
| [Deployment Guide](docs/deployment.md)                 | Production setup instructions  |
| [TrueNAS Guide](docs/truenas.md)                       | TrueNAS SCALE deployment       |
| [Troubleshooting](docs/troubleshooting.md)             | Common issues and fixes        |
| [Security Guide](docs/SECURITY.md)                     | Security architecture          |
| [Database Strategy](docs/DATABASE_STRATEGY.md)         | Migrations, backups            |
| [Metrics & Monitoring](docs/METRICS_AND_MONITORING.md) | Observability setup            |
| [Releases](RELEASES.md)                                | Version history and changelogs |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
