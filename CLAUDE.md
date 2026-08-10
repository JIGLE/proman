# ProMan — Claude Code Context

## Project Overview

ProMan (rebranding in progress to **Situs // Sovereign Capital System**) is a self-hosted
property management SaaS for landlords and property managers in **Portugal and Spain**. It
handles properties, units, tenants, leases, receipts, expenses, maintenance, correspondence,
and fiscal compliance, built around a reference-month rent ledger: bank movement → match →
allocate → receipt → tax filing → audit trail.

**Current version**: 1.16.3 | **Stage**: Production-ready core; Situs rebrand PRs 1–12 shipped
(brand, nav, landing, portfolio tree, rent ledger, bank matching, receipt lifecycle + PT tax
connector, OCR classification, audit trail/tax dashboard, schema consolidation, a11y/e2e pass).
Deferred: People/Operations/Intelligence IA consolidation (PR 10b), full infra rename (PR 13).

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
  services/
    allocation/       # Pure reference-month waterfall engine + Prisma orchestration
    matching/          # Pure bank-movement-to-lease confidence scoring engine
    bank/               # CSV import + fingerprint dedupe + matching pipeline
    receipts/          # Receipt document-lifecycle state machine + orchestration
    ocr/                # Mock document classification engine + orchestration
    tax/               # Tax connector find-or-create + submission-log service
  tax/connectors/      # Per-country TaxConnector implementations (pt-at.ts)
  design/country-themes.ts  # 28-country theme table (Situs brand)
prisma/
  schema.prisma     # Database schema — source of truth
messages/           # i18n translation files (en.json, pt.json, es.json, it.json)
tests/              # Vitest unit/integration tests
e2e/                # Playwright E2E tests
```

### Key Patterns

- **4-zone modal pattern**: Status+Health / Primary Action / Issues Panel / Tabbed info — used by the Tenant edit modal (`tenant-detail-modal.tsx`) and the Ticket detail modal (`ticket-detail-modal.tsx`). Property has no modal — `property-detail-view.tsx` renders in a `Sheet` from `/portfolio?modal=<id>`; Building has no modal either.
- **AppContext**: All entities (properties, tenants, leases, receipts, expenses, tickets, buildings…) live in `AppState` via `lib/contexts/app-context.tsx` (composed from `use-app-data.ts` + `use-entity-actions.ts` + `create-entity-actions.ts`). Mutations go through typed actions (`addProperty`, `updateTenant`, etc.). Bank/tax/OCR domains (added in the Situs rebrand) are read via dedicated fetches in their own components instead — they don't live in `AppState`.
- **API routes**: Each domain has its own folder under `app/api/`. Use `GET`/`POST`/`PUT`/`DELETE` handlers with Zod validation and NextAuth session checks.
- **Compliance**: PT (`/api/compliance/rent-receipts`) and ES (`/api/compliance/nrua`) endpoints generate fiscal payloads. Tax logic lives in `app/api/tax/`.
- **PII encryption**: AES-256-GCM on IBAN, NIF, phone fields via `lib/utils/pii-encryption.ts` (`encryptPII`/`decryptPII`, keyed off `PII_ENCRYPTION_KEY`). `PII_FIELDS` declares which model fields are covered — see `docs/PRODUCT_AUDIT_2026.md` §5 for wiring status.
- **Reference-month rent ledger** (Situs): `RentPeriod` is the persisted-derived spine — one row per lease per reference month, `status` recomputed in the same transaction as every allocation write (never hand-set). The waterfall invariant: always fill the oldest not-fully-allocated period first (`lib/services/allocation/engine.ts`, pure). `Tenant.paymentStatus` is fully derived from this ledger — the API layer refuses manual overrides.
- **Bank matching**: CSV/manual import → fingerprint dedupe (idempotent) → fuzzy-duplicate check → reconciliation rules → weighted confidence scoring (`lib/services/matching/engine.ts`, pure). ≥0.85 auto-allocates via a draft `Receipt` (`source: "automation"`); below that, the row waits in the Bank Movements inbox (Finance tab) for a human to confirm/reassign/ignore.
- **Receipt lifecycle**: `Receipt.status` is the MONEY state (paid|pending); `Receipt.lifecycle` is the separate DOCUMENT state machine (`lib/services/receipts/lifecycle.ts`, pure) — draft→review→emitted→(PT)submitted→accepted/rejected, or →voided from any pre-terminal state. Reaching emitted/accepted archives a PDF `Document`; voiding soft-reverses live `PaymentAllocation` rows.
- **Tax connectors**: one `TaxAuthorityConnector` row per user×country×connector key, `mode` locked to sandbox/review until explicitly promoted to live (no live AT/AEAT integration exists yet). Every call appends an immutable `TaxSubmissionLog` row — read via `GET /api/tax/connectors` (Finance › Tax Summary tab).
- **OCR classification**: mock-only today (`lib/services/ocr/classifier.ts`, pure) — proposes a document type from filename/description keywords across all 4 locales and links to whatever entity the upload already carried. Runs best-effort on every document upload; ambiguous or unlinked results land in the Documents "Review Required" tab.
- **Generalized audit trail**: `components/shared/audit-trail.tsx` + `GET /api/audit-trail` — pass `resourceIds` to scope to specific records (property detail Audit tab) or omit for the account-wide trail (Account page). Backed by `AuditLog.resourceType`/`resourceId`, persisted on every workflow mutation.
- **Screen density (declutter rules)**: established from a 2026-07 cross-page audit that found Finance/People/Operations stacking 6–9 chrome bands (duplicate headers, duplicate KPI rows, permanent filter pills) before any real content. Apply to every main list/detail screen:
  1. **One heading per screen.** If a container already renders a page title, the active tab's own view does not repeat it — the tab label is the heading.
  2. **One stat row, capped at 3–4 metrics.** Never stack two KPI/status rows on one screen; merge them. A metric nobody acts on belongs in a subtitle line, not a bordered panel.
  3. **Filters collapse behind one control past two — where they don't fit.** A search box plus one dropdown is a utility row; a search box plus a dropdown plus a wall of pills is not — fold pills into the dropdown or a single "Filters" popover. This is a space rule, not a count rule: above `lg` there is room to show three or four dropdowns inline, and visible filters beat a popover you have to open to see what is filtered, so `SearchFilter` (`components/ui/search-filter.tsx`) only collapses below `lg`. Collapse by state rather than `lg:hidden` so the DOM holds one of each control, not two.
  4. **Counts as text before counts as boxes.** Prefer an inline subtitle (e.g. `"12 units · 9 occupied (75%) · €14,100/mo"`, the Portfolio pattern) over separate stat panels when the counts aren't independently actionable.
  5. **Every sub-view heading goes through i18n or gets deleted.** A hardcoded-English heading sitting under a translated tab label is a sign it was never load-bearing.

## Responsive design (mobile-first rules)

Codified from the 2026-07 mobile audit (`scripts/mobile-audit.mjs`): a comprehensive measurement harness that walks every owner-facing page and modal at 390×844 (Pixel 5) and 393×851 (standard phone), in light + dark themes, to measure horizontal overflow, touch targets, text legibility, and clipping. The harness reports per-surface violations, ranked by severity. Apply these rules as the baseline; per-surface judgement refines dense-data layouts within them.

1. **Nothing scrolls horizontally at viewport width.** The page body and all its first-level children must fit within the viewport. Wide content (tables, grids, code blocks) scrolls _inside its own_ `overflow-x-auto` container with a sticky identity column or first element (e.g. a table's leading column stays pinned while data columns scroll right). Measured: `document.scrollingElement.scrollWidth > clientWidth` triggers a violation; offending elements are reported by depth.

2. **Touch targets are ≥44px CSS on the primary tap path.** Button, link, and interactive-element hit areas must be at least 44×44px (WCAG 2.2 AA recommendation, aligned with the audit's target floor). `Button` (`components/ui/button.tsx`) enforces this itself: every size variant below `xl` carries a `max-md:min-h-11`/`max-md:min-w-11` floor, so icon-only buttons (`icon`/`icon-sm`/`icon-lg`) get a padded 44×44 hit area below `md` without changing their smaller desktop footprint. Text links in prose and small control bars (e.g. close icon in a modal header) can be exempt only with explicit design review; measure via `getBoundingClientRect()` in the audit harness.

3. **Tables declare a mobile fallback strategy explicitly.** At `<md` breakpoint:
   - **Card fallback** (record lists, small row counts): reformat each row as a card with labels + data in read-only field-row pairs. Typical pattern: property-selection dropdown at top, then an iterable card layout using the `RenderTable` card-mode primitive (see `components/ui/table.tsx`).
   - **Horizontal scroll with sticky identity** (matrices, high-cardinality cross-column comparison): keep the first column (tenant name, date, lease) sticky/pinned on the left; allow data columns to scroll right inside a `overflow-x-auto` container. Never render an unwrapped table on mobile.

4. **Tab bars collapse to a select/popover on mobile when the labels don't fit.** This is a space test, not a count: the rule used to say "past ~4 items", and every 4-tab bar in the app failed it anyway — People overflowed by 346px, Contacts 290px, Operations 202px, each hiding 2 of its 4 tabs off-screen. The cause is label length, not tab count; Portuguese and Spanish labels run longer than the English ones the "~4" was eyeballed against, so a count threshold will always be wrong in some locale. Measure instead: if `scrollWidth > clientWidth` on the `[role=tablist]` at 390px in the **longest** locale, it collapses. Below `md`, hide the bar and substitute a `<select>` or `Popover` (Situs brand pattern: select when navigational tabs, popover when sub-view tabs). `TabsMobileSelect` (`components/ui/tabs.tsx`) is the select-fallback primitive — pair it with `max-md:hidden` on the existing `TabsList`, and place the select in the same flex row as any adjacent action button so the row doesn't gain a line. Labels and badge counts must sync across; the primitive renders a badge as `Label (3)`. A bar that genuinely fits (the tenant portal's single tab) keeps the bar at every width.

5. **Overlays (modals, sheets, popovers) are full-bleed below `md` and respect safe-area insets.** At `<md`:
   - Render as `Sheet` (bottom-sheet style) or full-screen overlay, not a centered modal dialog. Use `sheet-scroll-strategy: "content"` so the body scrolls independently and the primary action button stays pinned to the bottom (safe area included).
   - Apply `env(safe-area-inset-*)` padding to avoid notch/home-indicator overlap on iPhone.
   - Header and footer remain visible; scrollable body in the middle. Never let the primary CTA scroll out of reach.
   - At `≥md`, switch to a side panel or centered dialog as the design specifies.

6. **Multi-column forms are single-column below `md`.** When a form has 2+ columns, stack them into one column at `<md`. Use CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))` or explicit `md:` breakpoint rewrites — a form field should be full-width on small screens.

All surfaces are measured in the mobile audit (`scripts/mobile-audit.mjs`) on every PR that touches UI; violations are reported in the job summary (advisory, not blocking, per the current ratchet policy). As violations are fixed, re-run the harness to confirm zero horizontal overflow, touch-target and clipping metrics strictly decreasing.

## CI Gates

- ESLint: `--max-warnings=0` — zero warnings allowed
- Vitest: ~50% line coverage, enforced as a **ratchet** in `vitest.config.ts` (statements 49 /
  branches 36 / functions 34 / lines 50) — a PR may not lower it. Raise the floor when real
  tests land. Note the threshold keys must stay flat: Vitest reads a nested key under
  `thresholds` as a glob pattern, so the old `global: { ... }` wrapper matched nothing and
  enforced nothing.
- TypeScript: strict mode, `noEmit` check must pass

## Development Branch

All Claude Code changes go to: **`claude/proman-design-polish-6zpz2f`**

## Dependabot PRs

**Never push commits directly onto a `dependabot/*` branch to fix an issue the bump introduced.**
Dependabot treats external commits on its own branches as interference and can abandon/close the
PR in response (observed firsthand: pushing a fix to `dependabot/npm_and_yarn/production-minor-*`
got PR #276 silently closed, its branch desynced from GitHub's own PR/CI view even though the
git ref itself was correct — wasted a long back-and-forth before the closure was noticed). If a
Dependabot bump needs a fix (a lockfile conflict, a genuine break like a duplicate transitive
dependency), don't touch its branch — recreate the same version bumps plus the fix on a fresh
branch of your own (e.g. `chore/deps-<group-name>`), verify, and open a new PR instead. Let the
original Dependabot PR close on its own once superseded.

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
