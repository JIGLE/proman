# Releases

- Date: 2026-03-08
  - Version: v1.4.0
  - Image: `ghcr.io/jigle/proman:1.4.0`
  - Notes: Iberian compliance — full Portugal & Spain production readiness for 2026
    - **Portugal Compliance**: Recibos de Renda Eletrónicos module (AT XML submission, NIF validation, 5-day deadline enforcement)
    - **Portugal Tax**: 2026 IRS brackets, Renda Acessível flat 10% rate (rents ≤ €2,300/month)
    - **Portugal SAF-T**: RSA-SHA1 digital signature with hash chain across invoices, certificate from env
    - **Spain Compliance**: NRUA Ventanilla Única Digital — mandatory rental contract registry from 2026 (`NRUARegistration` model + XML export)
    - **Spain Tax**: Ley de Vivienda 12/2023 rent caps, stressed-zone deductions (50/60/70/90%), grandes tenedores detection (5+ units threshold)
    - **Database**: Migrated from SQLite to PostgreSQL; new migration `20260308000000_iberian_compliance` adds `StressedZone`, `NRUARegistration`, `RentReceipt` tables and Iberian columns on `Lease`/`Property`
    - **Payments**: SEPA Direct Debit mandate lifecycle API (create, list, cancel via Stripe)
    - **Security**: AES-256-GCM field-level PII encryption for IBAN, NIF, phone
    - **Automation**: Daily notification cron service — rent reminders (D-5), overdue notices (D+1, D+7), lease renewal (D-60), receipt deadline (D+4)
    - **Lease Templates**: Bilingual PDF generation — PT Contrato de Arrendamento Urbano (NRAU) and ES Contrato de Arrendamiento de Vivienda (LAU + Ley 12/2023)
    - **i18n**: Expanded from 82 to 236 keys across EN/PT/ES with full parity (compliance, tax, payments, leases, maintenance, documents, notifications, owners, invoices, tenant portal)
    - **Infrastructure**: K8s CronJob manifest for notification automation; `CRON_SECRET` env var protection
    - **Testing**: 36/36 unit tests green; 18 new E2E compliance endpoint tests
    - **Demo Safety**: `ENABLE_DEMO_LOGIN` kill switch for credentials provider

- Date: 2026-03-03
  - Version: v1.2.2
  - Image: `ghcr.io/jigle/proman:1.2.2`
  - Notes: Gold Standard audit — bug fixes, features, code quality & infrastructure
    - **Bug Fixes**: deleteExpense API call, contracts edit/delete with CSRF, units CRUD modal, analytics actual expenses, contacts API field names
    - **Features**: Expenses [id] route, Notifications API (CRUD + mark-all-read), live NotificationCenter, income-distribution stubs, version display in settings, env validation script
    - **Code Quality**: Auth pattern unification (8 routes → requireAuth), 24 `any` types eliminated, ambient module declarations, 0 tsc errors
    - **Infrastructure**: 15 database indexes (Lease, Document, Invoice, Notification), prestart env validation, unused SVG asset cleanup

- Date: 2026-03-02
  - Version: v1.1.7
  - Image: `ghcr.io/jigle/proman:1.1.7`
  - Notes: Security hardening and maintenance
    - **CodeQL Fixes**: Replaced all `Math.random()` with `crypto.randomBytes`/`crypto.randomUUID` in security-relevant contexts
    - **Regex Injection Fix**: Escaped user-provided template keys in email variable substitution
    - **Dependency Updates**: Merged 8 Dependabot PRs (production + dev deps + CI actions)
    - **Workflow Improvements**: Updated `actions/github-script` v6→v8, `azure/setup-helm` v1→v4, `azure/setup-kubectl` v3→v4, `peaceiris/actions-gh-pages` v3→v4, `trufflehog` v3.93.1→v3.93.3
    - **README**: Updated with auto DB init documentation and corrected env var table

- Date: 2026-03-02
  - Version: v1.1.6
  - Image: `ghcr.io/jigle/proman:1.1.6`
  - Notes: Fix TrueNAS deployment 500 errors
    - **Root Cause Fix**: Database auto-initialization on first startup (`AUTO_DB_INIT`)
    - **Dockerfile Fix**: Corrected `--chown` group from non-existent `nodejs` to `nextjs`
    - **Helm Values**: Added `INIT_SECRET`, `fsGroup:1001`, `initJob.enabled:true` to TrueNAS values
    - **Fail-Fast**: Container exits on missing DB tables in production instead of silently serving 500s
    - **Error Logging**: Auth middleware now logs actionable hints for "no such table" errors

- Date: 2026-02-05
  - Version: v1.1.0
  - Image: `ghcr.io/jigle/proman:1.1.0`
  - Notes: Bug fixes and improvements to auth, i18n, landing page, and mobile navigation. See GitHub Release for details.

- Date: TBD
  - Version: v0.9.0
  - Image: `ghcr.io/jigle/proman:0.9.0`
  - Notes: See [RELEASE_NOTES_v0.9.0.md](./RELEASE_NOTES_v0.9.0.md) for details

- Date: 2026-02-01
  - Version: v0.8.3
  - Image: `ghcr.io/jigle/proman:0.8.3`
  - Notes: Build fixes and Next.js 16 compatibility
    - **Build Fixes**: Resolved static generation errors for pages with client contexts
    - **Runtime Configuration**: Added proper dynamic rendering for client-heavy pages
    - **Next.js 16.1.6**: Full compatibility with latest Next.js version

- Date: 2026-02-01
  - Version: v0.8.2
  - Image: `ghcr.io/jigle/proman:0.8.2`
  - Notes: CI/CD workflow improvements
    - **Test Infrastructure**: Enhanced vitest configuration with 10 TypeScript path aliases
    - **GitHub Actions**: Added environment variables for proper build configuration
    - **Component Tests**: 73/85 tests passing (86% pass rate)

- Date: 2026-01-31
  - Version: v0.8.0
  - Image: `ghcr.io/jigle/proman:0.8.0`
  - Notes: Major feature release with payment system, tenant portal, and tax compliance
    - **Tenant Self-Service Portal**: Basic tenant portal for self-service operations
    - **Payment System**: Full payment integration for Portugal and Spain markets (MB Way, Multibanco, Bizum)
    - **Invoice-Payment Integration**: Link payments to invoices with reconciliation
    - **Portugal SAF-T PT Export**: Tax compliance export for Portuguese fiscal authorities
    - **Email Integration**: Complete email system with retry logic and metrics
    - **E2E Testing**: Comprehensive Playwright test suite for CI/CD
    - **CI/CD Fixes**: Workflow improvements for Prisma 7.x and Docker builds

- Date: 2026-01-29
  - Version: v0.7.0
  - Image: `ghcr.io/jigle/proman:0.7.0`
  - Notes: Major UI/UX improvements with search, filtering, sorting, export functionality, and comprehensive testing framework

- Date: 2026-01-10
  - Version: v0.1.1
  - Image: `ghcr.io/jigle/proman:0.1.1`
  - Notes: Bugfix: DB handling on first init — add post-install Prisma init job and include Prisma CLI in runtime image.
