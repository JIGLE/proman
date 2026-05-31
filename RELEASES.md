# Releases

- Date: 2026-05-04
  - Version: v1.13.0
  - Image: `ghcr.io/jigle/proman:1.13.0`
  - Notes: Sprint 4 & 5 completions — data model improvements, UX polish, lease workflow fixes
    - **Sprint 5**: Tickets 5.6 and 7.3 — additional UX and data model improvements
    - **Sprint 4**: Tickets 4.3, 4.5, 5.2, 2.5, 6.1, 6.2 — data model hardening and workflow fixes
    - **Roadmap**: All Q3 sprint items marked Done; ROADMAP.md updated to reflect completion
    - **Verification**: `tsc --noEmit` clean, `eslint --max-warnings=0` clean, all tests passing

- Date: 2026-04-29
  - Version: v1.12.1
  - Image: `ghcr.io/jigle/proman:1.12.1`
  - Notes: Lint compliance patch — property modal import cleanup
    - **Fix**: Removed unused `Plus` and `X` lucide-react imports from the property modal to satisfy `eslint --max-warnings=0`
    - **Fix**: Resolved duplicate `Receipt` identifier; added null-guards for state arrays in tests
    - **Verification**: `eslint --max-warnings=0` clean, all tests passing

- Date: 2026-04-25
  - Version: v1.12.0
  - Image: `ghcr.io/jigle/proman:1.12.0`
  - Notes: Portfolio refactor, property modal rewrite, map improvements, and demo redesign
    - **Portfolio**: Refactored portfolio workspace for cleaner owner/tenant separation
    - **Property Modal**: Full rewrite — richer overview, faster contextual actions, improved state guidance and mobile UX
    - **Map**: Improved property map rendering and interaction
    - **Demo**: Redesigned demo mode entry and presentation flows
    - **Verification**: `tsc --noEmit` clean, `eslint --max-warnings=0` clean, all tests passing

- Date: 2026-04-18
  - Version: v1.11.0
  - Image: `ghcr.io/jigle/proman:1.11.0`
  - Notes: Property creation and address-autocomplete reliability release
    - **CSP Fix**: Added `https://nominatim.openstreetmap.org` to `connect-src` so address autocomplete requests are allowed in production
    - **Property Creation Fix**: Prevented synthetic `buildingId` values from being sent during address selection, avoiding foreign-key failures on `POST /api/properties`
    - **Grouping Behavior**: Preserved property grouping in the UI by deriving a stable address-based fallback key when no real building relation exists
    - **Version Metadata**: Synchronized app and chart metadata to `1.11.0` across package, Helm, and TrueNAS catalog files

- Date: 2026-04-17
  - Version: v1.8.1
  - Image: `ghcr.io/jigle/proman:1.8.1`
  - Notes: Role-based portal UX and IA release — canonical People/Portfolio navigation, richer owner and tenant experiences, and improved demo mode
    - **IA Refresh**: Replaced top-level Tenants/Properties naming with canonical **People** and **Portfolio** routes while preserving compatibility via redirects
    - **Portfolio UX**: Simplified the shared portfolio workspace, reduced clutter, and made owner versus tenant presentation more relevant without splitting the app
    - **Dashboard & Landing**: Improved landing-page demo presentation and made the dashboard feel more engaging for both owner and tenant perspectives
    - **Property Experience**: Expanded the property detail modal with a fuller overview and faster contextual actions
    - **Mapping & Demo Data**: Kept the map on a free OpenStreetMap/Leaflet stack and ensured mock property data renders correctly in demo flows
    - **Payments & Documents**: Continued the simplified role-aware redesign across finance and document surfaces
    - **Verification**: `tsc --noEmit` clean, `eslint --max-warnings=0` clean, `vitest run` clean

- Date: 2026-04-14
  - Version: v1.7.1
  - Image: `ghcr.io/jigle/proman:1.7.1`
  - Notes: Production-grade quality pass — security, build stability, CI alignment, testing, and consistency
    - **Security**: Upgraded Next.js 16.2.1→16.2.3 (fixes high-severity DoS GHSA-q4gf-8mx6-v5v3); added @hono/node-server ≥1.19.13 override; `npm audit` reports 0 vulnerabilities
    - **Build Stability**: Added `serverExternalPackages` for redis and puppeteer to prevent Turbopack bundle failures on optional deps
    - **TypeScript**: Fixed 9 type errors (EmptyStateIllustration `entityType` alias prop); replaced unsafe `any` casts with proper typed casts in auth.ts and app-context.tsx
    - **ESLint**: Resolved 24 warnings across 14 files — unused imports, unused parameters, explicit any types; CI enforces `--max-warnings=0`
    - **CI/CD**: Fixed duplicate YAML `steps` blocks silently overriding in ci.yml and security-scan.yml; added Prettier format check to CI and production pipelines; aligned Node 22 across all workflows
    - **Formatting**: Added `.prettierrc` and `.prettierignore`; formatted 413 files for consistent style; fixed YAML indentation in production.yml
    - **Testing**: Added 36 payment service tests (singleton, Stripe integration, webhooks, transactions); total: 52 test files, 541 tests passing
    - **Documentation**: Corrected README database type (PostgreSQL→SQLite), version (1.4.0→1.7.1), test counts (37/86→52/541); added Demo Mode section
    - **Cleanup**: Deleted 5 stale output files; moved 8 analysis docs to docs/archive/; updated .gitignore
    - **i18n**: Verified 460 keys × 3 locales (pt, en, es) all in sync
    - **Verification**: `tsc --noEmit` clean, `eslint --max-warnings=0` clean, `prettier --check .` clean, 52/52 test files passing (541 tests)

- Date: 2026-03-11
  - Version: main@c7f2d65 (post-v1.4.0 stabilization)
  - Image: `ghcr.io/jigle/proman:1.4.0` (no image tag change)
  - Notes: Sprint execution completion — quality gates, security hardening, auditability, and documentation claim alignment
    - **Quality Gate**: CI now enforces `eslint --max-warnings=0`; required Playwright PR smoke gate added in `.github/workflows/ci.yml`
    - **Security**: Added timing-safe secret comparison utility and migrated cron auth token checks to constant-time comparison
    - **GDPR Auditability**: Admin database access route now writes `DATABASE_ACCESS` audit events with actor, scope, request metadata, and resilient failure handling
    - **Type/Lint Burn-down**: Warning backlog reduced to zero; strict lint ratchet introduced to prevent regression
    - **Testing Signal Cleanup**: Reduced expected test noise by normalizing error/log handling in high-noise suites (error-boundary, webhook, audit-log)
    - **Docs Governance**: Added active sprint board and claim audit report; marked legacy status doc as historical/non-authoritative
    - **Claim Alignment**: Public capability wording refreshed to avoid overclaims (notably payments/compliance phrasing) and test-baseline counts updated
    - **Verification**: `verify:ci` green at commit `c7f2d65` (37 test files, 86 passing, 6 skipped)

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
