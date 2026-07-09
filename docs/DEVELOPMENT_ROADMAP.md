# Domora — Development Roadmap (post-2026 audit)

**Purpose.** A forward, actionable development plan derived from
`docs/PRODUCT_AUDIT_2026.md`. Where `ROADMAP.md` is the _historical_ task log (phases
0–7, already shipped), this document is _what to build next and in what order_ to move
the North-Star. It is a living plan — check items off and update the status column.

**North-Star (from the audit):** _on-time compliant rent cycles closed per active
landlord per month._ Every milestone below is justified by how it moves that metric or
the trust required to sustain it.

**Sequencing principle.** Trust and the core loop before growth; measurement before
optimization; coherence and scale last. Do not start a later milestone's work before the
earlier milestone's exit criteria are met, unless explicitly parallel-safe (noted).

**Definition of done (every item).** Meets the CI gates (`npm run verify:ci`:
type-check + `lint --max-warnings=0` + tests, 93%+ coverage) **and**, for any change
touching UI/CSS/tokens/docs, the `docs/DESIGN_AWARD.md` bar (all-theme check + a
`npm run build`/dev-server render, since Tailwind CSS errors don't surface in
type-check/lint/tests). One finding = one commit.

---

## Milestone 0 — Ground truth (prerequisite, ~few days)

**Goal:** know what's actually shipped and stop building on sand. The audit found the
docs can't be trusted to say what's done (§6, §5 "doc integrity").

| #   | Item                                                                               | Acceptance                                                                      | Files                                                  |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 0.1 | Reconcile the `UX_AUDIT_2026` backlog to reality — mark C1–C4/H1–H6/etc. Done/Open | A single status table; Critical items' true state confirmed                     | `docs/UX_AUDIT_2026.md`                                |
| 0.2 | De-duplicate `ROADMAP.md`; reconcile the version number across sources             | One "Current State", one Decisions Log, one version                             | `ROADMAP.md`, `package.json`, `README.md`, `CLAUDE.md` |
| 0.3 | Fix `CLAUDE.md` inaccuracies                                                       | Correct encryption path, env var (`PII_ENCRYPTION_KEY`), add `it`, context path | `CLAUDE.md`                                            |
| 0.4 | Remove dead `next-i18next.config.js` (conflicts with live next-intl config)        | File deleted; build green                                                       | `next-i18next.config.js`                               |

**Status: Done** (2026-07-09) — all four items shipped; see the M0 commits on this
branch. Bonus fix found while verifying 0.1: a literal duplicate "Vendors" nav item in
`lib/portal/access.ts` was also removed.

**Exit criteria:** every subsequent milestone can cite an accurate status source. **Met.**

---

## Milestone 1 — Trust & the loop (P0, highest leverage)

**Goal:** make the compliance promise _true_ and make the core loop _reach the user
outside the app_. The single biggest step toward "essential."

### 1.1 Wire PII field encryption (trust-critical) — **Done** (2026-07-09)

- **Shipped as:** a Prisma Client Extension (`lib/services/database/pii-extension.ts`)
  wired into the shared `getPrismaClient()` singleton — encrypts on every create/
  createMany/update/updateMany/upsert, decrypts on every result, for all `PII_FIELDS`
  models. Plus `scripts/backfill-pii-encryption.js` (idempotent), a production warning
  in `scripts/validate-env.js` + `.env.example`, a unit test suite for the transform
  logic, and a real end-to-end test against a live Prisma+SQLite file confirming
  ciphertext at rest. See the "feat(security): wire PII field encryption" commit.
- **Why:** `PII_FIELDS` is defined but `encryptPII` is only used by the TOTP routes —
  NIFs/IBANs/phones are plaintext today (audit §5, verified §7-A).
- **Acceptance:** Owner/Tenant/PaymentMethod/RentReceipt/NRUA services encrypt on write
  and decrypt on read for every field in `PII_FIELDS`; a migration/backfill encrypts
  existing rows; a test asserts stored values are ciphertext; a startup check warns if
  `PII_ENCRYPTION_KEY` is unset in production.
- **Files:** `lib/utils/pii-encryption.ts` (source of `PII_FIELDS`) → the entity service
  layer; a one-off backfill script; `prisma/schema.prisma` if column sizing needs it.

### 1.2 Route automated reminders to email — **Done** (2026-07-09)

- **Shipped as:** `lib/services/notifications/reminder-email.ts`, called alongside each
  `notification.create()` in `notification-automation.ts` (inherits that call's existing
  per-entity dedup — no new "already sent" tracking needed). Gated on the **existing**
  `UserSettings.emailNotifications`/`.taxReminderNotifications` fields (already modeled
  and editable in Settings, just never wired to a send) — no new `NotificationPreference`
  model needed, which was the original guess in this row before implementation. New
  `notifications.email.*` i18n keys in all four catalogs, formatted via a small
  dependency-free formatter (`lib/utils/format-message.ts`) since `next-intl`'s
  `createTranslator` isn't exported from this version's top-level package types. Push
  notifications remain a follow-up (not started).
- **Why:** the #1 habit gap — reminders only `prisma.notification.create`, never leave
  the app (audit §3, verified §7-A).
- **Files:** `lib/services/notifications/{notification-automation,reminder-email}.ts`,
  `lib/utils/format-message.ts`, `messages/{en,pt,es,it}.json`.

### 1.3 Core-loop product analytics + server-side activation — **Done** (2026-07-09)

- **Shipped as:** two complementary pieces, not one events table for everything.
  `lib/services/analytics/activation-summary.ts` derives the activation timeline
  (first property/tenant/lease/paid-receipt) and aggregate metrics **directly from
  existing tables** (no new events needed — works retroactively for every existing
  user), exposed via `GET /api/activation` (self-serve) and
  `GET /api/admin/core-loop-metrics` (admin aggregate — the "minimal internal
  dashboard or query"). `lib/services/analytics/product-events.ts` is a generic
  sink reserved for signals with no other home — wired to exactly `reminder_clicked`
  in `notification-center.tsx` via `POST /api/events`. Onboarding dismissal moved
  from two `localStorage` keys to `UserSettings.onboardingDismissedAt` via the
  **existing** `/api/settings` endpoints (no new route needed); collapse state
  stays client-only (pure UI density, not a business signal).
- **New finding (out of scope to fix here):** running the full existing migration
  history via `prisma migrate deploy` against a from-scratch SQLite database fails
  partway through — `20260308000000_iberian_compliance` contains Postgres-only
  syntax (`DOUBLE PRECISION`, `ADD CONSTRAINT IF NOT EXISTS`) invalid on SQLite.
  Pre-existing, unrelated to this milestone. The project's real schema-application
  path is `prisma db push` against the live `schema.prisma`, which is unaffected.
  Worth a dedicated M0-style cleanup pass if `migrate deploy` is ever relied on for
  a from-scratch production bootstrap.
- **Why:** you can't measure the North-Star or re-drive activation today (audit §9).
- **Files:** `lib/services/analytics/{activation-summary,product-events}.ts`,
  `app/api/{activation,events,admin/core-loop-metrics}/route.ts`,
  `prisma/schema.prisma` (+ migration), `components/ui/{onboarding-checklist,
notification-center}.tsx`, `app/api/settings/route.ts`.

**Exit criteria:** PII at rest is encrypted; a landlord gets an email when rent is overdue
or a receipt is due; the team can chart activation and on-time-receipt rate. **Met** — all
three of Milestone 1's items are now done.

---

## Milestone 2 — Habit & reach (P1)

**Goal:** turn the reward loop into something worth protecting and bring the viral surface
up to the brand.

### 2.1 Tenant-portal parity — **Done**

- **Why:** the most viral surface is the least polished (audit §5 "growth & virality").
- **Acceptance:** migrate `app/tenant-portal/[token]/page.tsx` off hardcoded gray/blue
  Tailwind onto the Domora design tokens (themes/dark-mode work); replace the hardcoded
  `pt-PT`/EUR `Intl` formatting (lines 248, 251) with locale-aware formatting; replace
  `alert()` (298, 306) with real in-app UI feedback; add a durable/recoverable access path
  (not email-token-only). Note: copy is already i18n'd — do **not** redo that.
- **Files:** `app/tenant-portal/[token]/page.tsx`, `app/tenant-portal/layout.tsx`.
- **Shipped as:**
  - Design tokens: replaced all 55 hardcoded gray/blue/green/red/yellow/amber Tailwind
    literals in `app/tenant-portal/[token]/page.tsx` (plus two `bg-white` header/footer
    literals) with the existing `var(--color-*)` semantic tokens, matching the convention
    from the earlier design-polish pass. Zero raw color literals remain (verified by grep).
  - Locale-aware formatting: `app/api/tenant-portal/[token]/route.ts` now selects
    `property.currency`; the client's `TenantPortalData` interface carries it through;
    `formatCurrency`/`formatDate` use `useLocale()` (next-intl) plus
    `getCurrencyLocale()` from `lib/utils/currency.ts` instead of the hardcoded
    `pt-PT`/`EUR` literals (added an `it` entry to that helper's locale map, since it was
    missing but "it" is a supported catalog). Currency falls back to `EUR` when a tenant
    has no linked property.
  - Real UI feedback: added a `paymentMsg` state (mirrors the existing `submitMsg`/
    `phoneMsg` pattern already in this file) and render it inline next to both "Pay Now"
    entry points (dashboard card and the invoices list); the two `alert()` calls in
    `handlePayInvoice` are gone.
  - Durable/recoverable access: new unauthenticated `POST /api/tenant-portal/resend`
    (`app/api/tenant-portal/resend/route.ts`, rate-limited, always returns a generic
    `{ sent: true }` regardless of match so it can't be used to enumerate tenant emails)
    calls the existing `tenantPortalService.sendInvitation`; the landing page
    (`app/tenant-portal/page.tsx`) gained a small client form (`resend-link-form.tsx`)
    so a tenant who lost their link can self-serve a new one by email instead of only
    being told to "ask your manager."
  - New finding (out of scope to fix here): `handlePayInvoice`'s "Invoice {number}"
    label was fixed to go through `t("invoiceLabel")`, but the Documents tab's
    `Expires {formatDate(...)}` string (line ~948) is still raw English — left for 2.3,
    which already owns the i18n-the-behavioral-surfaces sweep. Also noted:
    `tenantPortalService.sendInvitation`'s emailed HTML is hardcoded English and its
    "This link will expire in 30 days" copy doesn't match the actual 7-day
    `TOKEN_EXPIRATION` — pre-existing, not touched.

### 2.2 Activate-or-delete engagement code; convert rewards to streaks — **Done**

- **Why:** achievements are dead code; one-time badges don't build habit (audit §3).
- **Acceptance:** either render `AchievementGrid` in a real surface **and** reframe the
  rewards as consistency streaks (e.g. "N consecutive on-time compliance months"), or
  delete the dead component; resolve the unused `AttentionNeeded` vs `ActionPanel`
  duplication (keep one); decide whether demo auto-play scenarios are surfaced or removed.
- **Files:** `components/ui/achievements.tsx`, `components/ui/quick-actions.tsx`,
  `lib/demo/demo-scenarios.ts`, dashboard surface.
- **Shipped as:**
  - Deleted `components/ui/achievements.tsx` (`AchievementGrid`/`AchievementBadge`) and
    `components/ui/quick-actions.tsx` (`QuickActions` *and* `AttentionNeeded`) — verified
    zero imports of any of the four exports anywhere outside their own files before
    removing them, plus their now-orphaned `achievements`/`achievementsDescription`
    message keys in all four locale catalogs. `AttentionNeeded` was the dead duplicate
    of `ActionPanel` (already live, tokenized, i18n'd, tested); `ActionPanel` is the one
    kept.
  - Rather than resurrect the deleted badge grid, built the real streak mechanic the
    audit recommended in its place: `getComplianceStreak()`
    (`lib/services/analytics/activation-summary.ts`) derives "N consecutive months with
    every active lease's rent collected on time" from existing `Lease`/`Receipt` rows
    (same retroactive-by-construction approach as M1.3's activation summary — no new
    event needed). Exposed via the existing `GET /api/activation` (now also returns
    `complianceStreak`). `ActionPanel` (`components/features/dashboard/action-panel.tsx`)
    fetches it and shows a streak pill next to the "all clear" state — the reward now
    appears at the exact moment the Hook-loop reward should land, instead of a
    disconnected badge shelf nobody saw.
  - Demo auto-play scenarios: already surfaced (`components/shared/scenario-runner.tsx`
    is mounted in `app/[locale]/(main)/layout.tsx`) — no action needed, acceptance
    criterion already met.

### 2.3 i18n the behavioral surfaces

- **Why:** hardcoded English on behavioral surfaces in a PT/ES market is a trust/retention
  issue (audit §5 "i18n completeness").
- **Acceptance:** `insights-view.tsx`, `payment-matrix-view.tsx` (month abbreviations),
  `notification-center.tsx`, the `onboarding-checklist.tsx` completion copy, and
  `empty-state-illustrations.tsx` all go through `useTranslations`; keys added to all four
  catalogs; `npm run i18n:check` passes.

### 2.4 Collapse duplicate attention surfaces into one loop

- **Why:** `Insights` recomputes the dashboard's overdue/expiring/vacant alerts, diluting
  the single daily loop (audit §5, §3).
- **Acceptance:** one authoritative `ActionPanel`-driven attention surface; Insights either
  drops its redundant "Action Items" or becomes a distinct analytical (not triage) view.
- **Files:** `components/features/insights/insights-view.tsx`,
  `components/features/dashboard/overview-view.tsx`.

**Exit criteria:** a tenant sees a branded, themeable, locale-correct portal; the reward
loop is a streak; no behavioral surface renders raw English; one triage loop, not two.

---

## Milestone 3 — Coherence & scale (P2)

**Goal:** remove structural risk and decide the ceiling.

| #   | Item                                                                                                             | Why                                                                                 | Files                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3.1 | Consolidate duplicated entity-detail UIs and duplicate routes (`/portfolio`↔`/properties`, `/people`↔`/tenants`) | ~2,400 LOC divergence risk; two names per thing (audit §4)                          | `components/features/{property,tenant}/*`, `app/[locale]/(main)/*` |
| 3.2 | Decide the identity model: stay single-account, or plan Org/Team                                                 | Determines the agency/"Business" ceiling; global-unique emails block multi-org (§4) | `prisma/schema.prisma` + queries                                   |
| 3.3 | Adopt one IA (task-oriented) and delete the other two visions                                                    | Three conflicting IA docs today (audit §6)                                          | the three IA docs; sidebar/nav                                     |
| 3.4 | Validate & wire monetization, or commit to open-source-first                                                     | Pricing tiers are unbacked copy; no Stripe subscription wiring (audit §2)           | Stripe subscription layer; plan gating                             |
| 3.5 | Plan the storage path (SQLite BLOBs → external/Postgres) if scale is a goal                                      | `Lease.contractFile` BLOBs + load-everything context cap large portfolios (§4)      | `lib/contexts/use-app-data.ts`, storage layer                      |

**Exit criteria:** one implementation per entity/route; a decided identity + monetization
posture; a stated scale plan.

---

## Cadence & tracking

- Work milestone-by-milestone; within a milestone, one finding = one commit.
- Keep a status column (`Todo` / `In progress` / `Done` / `Won't do`) on each item and
  update it as you go — this file is the source of truth for "what's next," `ROADMAP.md`
  for "what shipped."
- Re-run the audit's verification lens on each change: does the North-Star input it
  targets actually move? If a metric can't move yet (Milestone 1.3 not done), note it.

## Relationship to other docs

- `docs/PRODUCT_AUDIT_2026.md` — the _why_ (analysis, findings, North-Star). This roadmap
  is the _what/when/how_.
- `docs/UX_AUDIT_2026.md`, `UX_IMPROVEMENT_PLAN.md`, `UI_CONSISTENCY_GUIDE.md` — the
  UX/IA detail behind Milestones 2–3 (esp. 2.4, 3.3).
- `docs/DESIGN_AWARD.md` — the quality bar every UI item must clear.
- `ROADMAP.md` — the historical, already-shipped log (fix its duplication in 0.2).
