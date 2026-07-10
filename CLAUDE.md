# ProMan — Claude Code Context

## Project Overview

ProMan is a self-hosted property management SaaS for landlords and property managers in **Portugal and Spain**. It handles properties, units, tenants, leases, receipts, expenses, maintenance, correspondence, and fiscal compliance.

**Current version**: 1.15.0 | **Stage**: Production-ready (all Q3 sprints complete through Phase 7)

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js 16 (App Router, TypeScript strict)      |
| Database   | Prisma ORM + SQLite (via better-sqlite3)        |
| Auth       | NextAuth.js v4 (Google OAuth + credentials)     |
| UI         | shadcn/ui + Tailwind CSS v4 + Radix UI + Framer |
| Validation | Zod v4                                          |
| Email      | SendGrid                                        |
| Testing    | Vitest (unit/integration) + Playwright (E2E)    |
| i18n       | next-intl (PT / EN / ES / IT)                   |
| Payments   | Stripe (card + SEPA Direct Debit)               |
| Deploy     | Docker / Kubernetes / Helm / TrueNAS SCALE      |

## Key Commands

```bash
npm run dev            # Start dev server on http://localhost:3000
npm test               # Run Vitest unit/integration suite
npm run lint           # ESLint with --max-warnings=0 (CI gate)
npm run type-check     # tsc --noEmit
npm run verify         # type-check + test
npm run verify:ci      # type-check + lint + test

npx prisma db push     # Push schema changes to SQLite
npx prisma generate    # Regenerate Prisma client after schema changes
npx prisma studio      # Browse database in browser
```

## Architecture

### Directory Layout

```
app/
  api/                    # Next.js API route handlers (one folder per domain)
  [locale]/(main)/        # Owner-facing app pages (locale-prefixed)
  tenant-portal/          # Tenant self-service pages (token-based access)
components/         # Shared React components
lib/
  types.ts            # Canonical TypeScript types for all entities
  contexts/app-context.tsx  # Global AppState + AppContext (React context)
  prisma.ts            # Prisma client singleton
prisma/
  schema.prisma     # Database schema — source of truth
messages/           # i18n translation files (en.json, pt.json, es.json, it.json)
tests/              # Vitest unit/integration tests
e2e/                # Playwright E2E tests
```

### Key Patterns

- **4-zone modal pattern**: Status+Health / Primary Action / Issues Panel / Tabbed info — used by the Tenant edit modal (`tenant-detail-modal.tsx`) and the Ticket detail modal (`ticket-detail-modal.tsx`). Property has no modal — `property-detail-view.tsx` renders in a `Sheet` from `/portfolio?modal=<id>`; Building has no modal either.
- **AppContext**: All entities (properties, tenants, leases, receipts, expenses, tickets, buildings…) live in `AppState` via `lib/contexts/app-context.tsx` (composed from `use-app-data.ts` + `use-entity-actions.ts` + `create-entity-actions.ts`). Mutations go through typed actions (`addProperty`, `updateTenant`, etc.).
- **API routes**: Each domain has its own folder under `app/api/`. Use `GET`/`POST`/`PUT`/`DELETE` handlers with Zod validation and NextAuth session checks.
- **Compliance**: PT (`/api/compliance/rent-receipts`) and ES (`/api/compliance/nrua`) endpoints generate fiscal payloads. Tax logic lives in `app/api/tax/`.
- **PII encryption**: AES-256-GCM on IBAN, NIF, phone fields via `lib/utils/pii-encryption.ts` (`encryptPII`/`decryptPII`, keyed off `PII_ENCRYPTION_KEY`). `PII_FIELDS` declares which model fields are covered — see `docs/PRODUCT_AUDIT_2026.md` §5 for wiring status.

## CI Gates

- ESLint: `--max-warnings=0` — zero warnings allowed
- Vitest: 93%+ coverage baseline
- TypeScript: strict mode, `noEmit` check must pass

## Development Branch

All Claude Code changes go to: **`claude/determined-clarke-swzwsz`**

## Roadmap

See `ROADMAP.md` for full task history. All Q3 sprints (Phases 0–7) are complete. The `ROADMAP.md` Decisions Log records architectural choices and their rationale.

## Environment

Copy `.env.example` to `.env` before first run. Required vars:

- `DATABASE_URL` — SQLite file path (e.g. `file:./dev.db`)
- `NEXTAUTH_SECRET` — random secret for session signing
- `NEXTAUTH_URL` — base URL (e.g. `http://localhost:3000`)

Optional: `SENDGRID_API_KEY`, `STRIPE_SECRET_KEY`, `REDIS_URL`, `PII_ENCRYPTION_KEY`

Optional (app subscription billing — Free/Pro/Business landing-page tiers, distinct from
tenant rent collection): `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS`,
`STRIPE_TRIAL_DAYS_PRO`, `ENABLE_BILLING` (plan-limit enforcement; off by default, so
self-hosted instances are always unlimited).
