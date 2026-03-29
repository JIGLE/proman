# ProMan Roadmap

> Living document. Single source of truth for planned work.
> Last updated: 2026-03-28.

## Current State

**Version**: 1.5.4
**Stage**: Production-ready MVP with comprehensive test coverage and monitoring.

### Completed Features

- **Authentication**: NextAuth v4 with Google OAuth + credentials provider, CSRF protection, session-based auth
- **CRUD Operations**: Full create/read/update/delete for Properties, Units, Tenants, Leases, Receipts, Expenses, Maintenance Tickets, Correspondence, Owners, Contacts, Documents, Invoices, Notifications
- **Email Integration**: SendGrid with templates, bulk sending, delivery tracking via webhooks, exponential-backoff retry
- **Monitoring**: Health endpoints (`/api/health`, `/api/health/db`, `/api/health/email`), Prometheus-compatible `/api/metrics`
- **Compliance**: GDPR audit logging, Iberian tax compliance (PT/ES), admin data-access audit trail
- **Internationalization**: next-intl with PT, EN, ES locale support
- **UI/UX**: Radix UI / shadcn components, advanced search + filtering, CSV export, dark theme, responsive layout
- **Testing**: Vitest unit/integration suite (93%+ coverage), Playwright E2E suite (36 tests), CI quality gates
- **Security**: CSP with nonces, input sanitization, rate limiting, timing-safe auth comparisons, security headers
- **Infrastructure**: Dockerized for TrueNAS SCALE, standalone Next.js output, SQLite with automatic initialization, Helm chart

---

## Phase 1 — Infrastructure Hardening (P0) ✅ Current Sprint

| #   | Task                                                                             | Status  |
| --- | -------------------------------------------------------------------------------- | ------- |
| 1.1 | Add `development` stage to Dockerfile (fix `docker-compose --profile dev build`) | ✅ Done |
| 1.2 | Sync TrueNAS version label in `docker-compose.yml` to 1.5.4                      | ✅ Done |
| 1.3 | Fix E2E `workflow-property.spec.ts` (default tab = map, "Add Property" hidden)   | ✅ Done |

## Phase 2 — Test Coverage & CI (P1)

| #   | Task                                                          | Status      |
| --- | ------------------------------------------------------------- | ----------- |
| 2.1 | Unblock remaining E2E workflow tests (tenant, lease, payment) | Not started |
| 2.2 | Add E2E seed data fixture for deterministic test runs         | Not started |
| 2.3 | Staging validation: deploy, run full suite, verify monitoring | Not started |

## Phase 3 — Financial Features (P1)

| #   | Task                                             | Status      |
| --- | ------------------------------------------------ | ----------- |
| 3.1 | Advanced income/expense categorization           | Not started |
| 3.2 | Automated rent collection reminders (cron-based) | Not started |
| 3.3 | Monthly/yearly financial reports with charts     | Not started |
| 3.4 | Payment processor integration (Stripe)           | Not started |

## Phase 4 — Document & PDF Enhancements (P2)

| #   | Task                                    | Status      |
| --- | --------------------------------------- | ----------- |
| 4.1 | User-configurable PDF templates         | Not started |
| 4.2 | Multi-language PDF generation           | Not started |
| 4.3 | Company branding in PDFs (logo, colors) | Not started |
| 4.4 | Bulk PDF generation for batch workflows | Not started |

## Phase 5 — UX Polish (P2)

| #   | Task                                         | Status      |
| --- | -------------------------------------------- | ----------- |
| 5.1 | Mobile-first design overhaul                 | Not started |
| 5.2 | Tablet layout optimization                   | Not started |
| 5.3 | Touch-friendly interactions                  | Not started |
| 5.4 | Performance optimization for mobile networks | Not started |

## Phase 6 — Advanced Features (P3)

| #   | Task                                                               | Status      |
| --- | ------------------------------------------------------------------ | ----------- |
| 6.1 | Tenant portal self-service (maintenance requests, payment history) | Partial     |
| 6.2 | Owner portal with income distribution reporting                    | Partial     |
| 6.3 | Workflow automation engine (lease renewals, payment follow-ups)    | Not started |
| 6.4 | Analytics dashboard with KPI trends                                | Partial     |
| 6.5 | MB WAY / Bizum payment integration (requires provider credentials) | Placeholder |

---

## Decisions Log

| Date       | Decision                                            | Rationale                                                            |
| ---------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| 2026-03-28 | Keep MB WAY/Bizum as documented placeholders        | No provider credentials available; documented clearly in public docs |
| 2026-03-11 | Sprint board is single source of planning truth     | Stale status docs marked historical                                  |
| 2026-03-11 | Warning ratchet enforced in CI (`--max-warnings=0`) | Prevents warning debt regression                                     |
