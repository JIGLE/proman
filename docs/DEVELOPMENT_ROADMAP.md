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
    `components/ui/quick-actions.tsx` (`QuickActions` _and_ `AttentionNeeded`) — verified
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

### 2.3 i18n the behavioral surfaces — **Done**

- **Why:** hardcoded English on behavioral surfaces in a PT/ES market is a trust/retention
  issue (audit §5 "i18n completeness").
- **Acceptance:** `insights-view.tsx`, `payment-matrix-view.tsx` (month abbreviations),
  `notification-center.tsx`, the `onboarding-checklist.tsx` completion copy, and
  `empty-state-illustrations.tsx` all go through `useTranslations`; keys added to all four
  catalogs; `npm run i18n:check` passes.
- **Shipped as:**
  - `insights-view.tsx`: fully wired to a new `insights` namespace (subtitle, KPI labels,
    action-item copy with real ICU plurals for overdue/expiring/vacant counts, chart
    labels, quick-link copy). Month abbreviations for the revenue sparkline now come from
    the existing `calendar.months` namespace instead of a hardcoded `["Jan","Feb",...]`
    array — the same fix applied to `payment-matrix-view.tsx`'s table header months.
  - `payment-matrix-view.tsx`: new `paymentMatrix` namespace covers the toolbar, summary
    cards, table headers, per-cell tooltips (built from the existing `paid`/`pending`/
    `overdue` labels plus a locale-aware `toLocaleDateString`), and the color legend.
    Also fixed one stray hardcoded `bg-gray-200` found while in the file.
  - `notification-center.tsx`: new `notificationCenter` namespace — header, filter tabs,
    empty states, footer, per-item tooltips, and relative-time formatting (`formatRelativeTime`
    now takes the translator so "Just now/Xm ago/Xh ago/Xd ago" and the priority badge
    text are localized instead of raw English/enum values).
  - `onboarding-checklist.tsx`: the completion panel's "You're all set!" / "What's next?"
    suggestions and the "Dismiss" tooltip now use the existing `onboarding` namespace
    (extended with a few keys). Also deleted the dead `getDefaultOnboardingSteps` factory
    — grep confirmed it had zero callers (the live dashboard builds its own already-i18n'd
    `richSteps`/`onboardingSteps` instead), so translating unreachable code would have
    been wasted, dead-but-now-translated cruft.
  - `empty-state-illustrations.tsx`: discovered the repo already had a complete-looking
    `emptyState` i18n namespace that **no component actually consumed** — same orphaned-
    keys pattern as `achievements`/`insights` before this milestone. Rather than add a
    third, separate set of strings, extended `emptyState` to match this component's
    richer per-type copy (title/description/action for all 16 entity types) and rewired
    the component's icon/gradient table (`emptyStateMeta`) to pull its text from
    `useTranslations("emptyState")` by type, so the namespace is finally live.
  - Fixed 3 pre-existing tests (`tenants-view.test.tsx`, `receipts-view.test.tsx`,
    `properties-view.test.tsx`) that asserted on the old hardcoded English empty-state
    copy — the repo's global `next-intl` test mock echoes translation keys verbatim
    (`useTranslations: () => (key) => key`), so their assertions now match the
    `<type>.title` key output instead of literal English, consistent with how other
    i18n'd components are already tested in this suite.

### 2.4 Collapse duplicate attention surfaces into one loop — **Done**

- **Why:** `Insights` recomputes the dashboard's overdue/expiring/vacant alerts, diluting
  the single daily loop (audit §5, §3).
- **Acceptance:** one authoritative `ActionPanel`-driven attention surface; Insights either
  drops its redundant "Action Items" or becomes a distinct analytical (not triage) view.
- **Files:** `components/features/insights/insights-view.tsx`,
  `components/features/dashboard/overview-view.tsx`.
- **Shipped as:** deleted `insights-view.tsx`'s "Action Items" card and its backing
  `alerts` useMemo entirely — it re-derived the same overdue/expiring-lease/vacant-unit
  triage `ActionPanel` (`components/features/dashboard/action-panel.tsx`) already computes
  and renders on the dashboard, with its own separate severity styling and no i18n. Rather
  than reconcile two computations of the same alerts, Insights now commits fully to being
  the **analytical** view the acceptance criteria call for: KPI row, revenue trend, portfolio
  mix, an upcoming-lease-expirations _list_ (informational, not an actionable alert card),
  and quick links — updated the file's header doc-comment to say so explicitly. Removed the
  now-dead `overdueReceipts`/`overdueAmount`/`vacantCount` fields from the `metrics` memo and
  the now-unused `AlertTriangle`/`CheckCircle2`/`CalendarClock` icon imports, and pruned the
  9 `insights.*` i18n keys (`actionItems`, `allClear`, `noActionItems`, `overduePayments`,
  `leasesExpiringSoon`, `within60Days`, `vacantProperties`, `occupiedPercent`, `severity.*`)
  that existed only to back the deleted card — including the pre-existing orphaned
  `occupancyRate`/`severity` keys nobody had wired up even before this milestone.
  `overview-view.tsx` needed no changes: it already renders `ActionPanel` as the one
  dashboard triage surface.

**Exit criteria:** a tenant sees a branded, themeable, locale-correct portal; the reward
loop is a streak; no behavioral surface renders raw English; one triage loop, not two. **Met**
— all four of Milestone 2's items are now done.

---

## Milestone 3 — Coherence & scale (P2)

**Goal:** remove structural risk and decide the ceiling.

| #   | Item                                                                                                                        | Why                                                                                 | Files                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3.1 | Consolidate duplicated entity-detail UIs and duplicate routes (`/portfolio`↔`/properties`, `/people`↔`/tenants`) — **Done** | ~2,400 LOC divergence risk; two names per thing (audit §4)                          | `components/features/{property,tenant}/*`, `app/[locale]/(main)/*` |
| 3.2 | Decide the identity model: stay single-account, or plan Org/Team — **Done**                                                 | Determines the agency/"Business" ceiling; global-unique emails block multi-org (§4) | `prisma/schema.prisma` + queries                                   |
| 3.3 | Adopt one IA and delete the other two visions — **Done**                                                                    | Three conflicting IA docs today (audit §6)                                          | the three IA docs; sidebar/nav                                     |
| 3.4 | Validate & wire monetization, or commit to open-source-first — **Done**                                                     | Pricing tiers are unbacked copy; no Stripe subscription wiring (audit §2)           | Stripe subscription layer; plan gating                             |
| 3.5 | Plan the storage path (SQLite BLOBs → external/Postgres) if scale is a goal — **Done**                                      | `Lease.contractFile` BLOBs + load-everything context cap large portfolios (§4)      | `lib/contexts/use-app-data.ts`, storage layer                      |

**Exit criteria:** one implementation per entity/route; a decided identity + monetization
posture; a stated scale plan. **Met** — all five of Milestone 3's items are now done.

### 3.2 — Shipped as: stay single-account, no Org/Team model now

Investigated before deciding, rather than guessing between the two options the roadmap
item posed. Full reasoning and trigger conditions for revisiting are in
`ROADMAP.md`'s Decisions Log (2026-07-09 entry) — summary:

- **Confirmed the true cost of each option** by reading the code, not assuming: 24
  Prisma models are scoped directly by `userId`; `Tenant.email` and `Owner.email` are
  both globally unique across every account (the specific blocker the audit named).
  A lighter-weight "share data via an effective-owner resolution in auth" alternative
  looked cheaper at first, but only ~5 routes (`properties`/`tenants`/`leases`/
  `receipts`/`documents`) go through the `getAccessContext` helper that centralizes
  scope resolution — the other ~60 routes (expenses, maintenance, invoices,
  notifications, tax filings, GDPR export/delete, admin) call `requireAuth` directly.
  Consistent sharing would mean changing what `userId` means across nearly the whole
  API surface, including GDPR/admin-sensitive routes. Same order of magnitude as full
  Org/Team, just shaped differently — not actually "minimal."
- **Decision: stay single-account.** No `Organization`/`TeamMember` model, no auth
  rescoping, right now.
- **Closed the resulting truth gap immediately:** the Business tier's "Team access (up
  to 5 users)" landing-page claim became a real, sold Stripe line item as of 3.4 — worse
  to leave unbacked now than before. Reworded to "Team access (coming soon)" in all four
  locale catalogs (`messages/*.json`). `lib/billing/plan-limits.ts`'s `maxSeats` field is
  kept (unused/unenforced) as a placeholder for when this is actually built, with a
  comment pointing at the Decisions Log entry.
- **No code changes to `prisma/schema.prisma` or auth middleware** — this item stayed
  scoped to the decision + the one honesty fix it required.

### 3.3 — Shipped as: adopted the IA that's actually live, not "task-oriented"

This item's original framing (written into this roadmap during the initial audit) said
"adopt one IA (task-oriented)." Investigating before executing that literally turned up
something the roadmap's author (an earlier pass of this same work) hadn't checked: one
of the three competing visions was **already shipped**, not merely proposed.

- `docs/UX_AUDIT_2026.md`'s own M0.1 status reconciliation (§C2, done earlier this
  engagement) already confirmed its Operations/Intelligence(Reports)/System sidebar
  proposal is live in `lib/portal/access.ts` — the actual code was checked, not assumed.
  `docs/UX_IMPROVEMENT_PLAN.md`'s "task-oriented" nav (§3.1) is explicitly self-flagged
  as **XL/multi-sprint effort requiring a design sprint and real user validation** before
  engineering — neither happened. Overwriting a nav that already reflects several real,
  reasoned, shipped decisions (see `ROADMAP.md`'s Decisions Log: "Maintenance promoted to
  first-class nav item," "Analytics, Insights, Reports added to nav in Phase 1") with an
  unvalidated redesign would have been a regression dressed up as roadmap completion.
- **Decision: adopt `docs/UX_AUDIT_2026.md`'s IA as canonical** (it's what's live);
  mark `docs/UI_CONSISTENCY_GUIDE.md`'s "Assets/People/Finance" proposal and
  `docs/UX_IMPROVEMENT_PLAN.md` §3.1's task-oriented proposal as **not adopted** with
  status notes in both docs explaining why and pointing at the canonical source — rather
  than deleting either file, since both contain substantial unrelated content (general
  UI rules; the rest of a multi-phase improvement plan) still worth keeping.
- **No sidebar/nav code changes** — `lib/portal/access.ts` already matches the adopted
  vision (with a few small, already-justified evolutions since the original diagram:
  Vendors added, Correspondence stayed separate from Documents, Compliance/Tax Filing
  became their own System items). Documented those deltas directly in
  `docs/UX_AUDIT_2026.md` rather than redrawing the diagram.

### 3.5 — Shipped as: storage/scale strategy doc (chose "plan," not "migrate")

Scoped deliberately as a plan, not a migration: self-hosted-on-SQLite is a core, load-bearing
part of ProMan's positioning (zero external dependencies), so an unconditional move to
PostgreSQL would work against the product rather than for it. Extended the existing (and
previously stale) `docs/DATABASE_STRATEGY.md` rather than creating a second, parallel
doc — same reuse-over-duplication call made for the `emptyState`/`insights` i18n
namespaces in milestone 2.3.

- Confirmed and quantified the audit's two named risks by reading the actual code:
  `Lease.contractFile` is the _only_ `Bytes` field in the schema (`Document` already
  does file storage correctly via `storagePath`), and `lib/contexts/use-app-data.ts`
  fires 10 unpaginated fetches in parallel on every mount — a client/API-shape problem
  that would persist under PostgreSQL too, not a database-engine problem.
- Documented concrete trigger thresholds for when PostgreSQL actually becomes
  necessary (a hosted/managed offering; SQLite file crossing ~5–10 GB; no-downtime
  node-failure requirements) — with the explicit recommendation not to migrate
  speculatively ahead of any of those.
- Wrote the concrete migration path for when triggered: provider-aware Prisma client
  construction (branch on `DATABASE_URL` scheme, not a schema fork), an
  application-level Prisma-to-Prisma data copy tool (not a raw SQL dump, so the
  PII-encryption extension and BLOB fields transform correctly on both sides), and
  PostgreSQL as strictly additive — self-hosted SQLite stays the supported default.
- Surfaced a previously undocumented finding while researching: the migration history
  contains a leftover from a prior, apparently-abandoned PostgreSQL era —
  `prisma/migrations/20260308000000_iberian_compliance/` has Postgres-only SQL
  (`pg_enum`/`DO $$` blocks, `DOUBLE PRECISION`) that breaks `prisma migrate deploy`
  replayed from empty on SQLite. This was already known from milestone 1.3's
  investigation; this pass connects it explicitly to the future migration path (fresh
  per-engine baseline migrations, not replaying the mixed-syntax history) rather than
  leaving it as an isolated, unexplained bug note. Left unfixed per this item's scope
  (doc only) — a real fix is future work if/when PostgreSQL is actually adopted.
- No code changes in this item — see `docs/DATABASE_STRATEGY.md` for the full plan.

### 3.4 — Shipped as: real Stripe subscription billing (chose "validate & wire")

Went with wiring real billing rather than committing to open-source-only, since the
landing page already sells three tiers and the audit's own framing was "no monetization
mechanism" — the gap was implementation, not product intent.

- **Schema:** new `Subscription` model (1:1 with `User`, same shape as `UserSettings`) —
  `plan`/`status`/`stripeCustomerId`/`stripeSubscriptionId`/`stripePriceId`/
  `currentPeriodEnd`/`cancelAtPeriodEnd`. No row for a user means Free; a row is created
  lazily on first Checkout. Hand-written migration
  `prisma/migrations/20260709130000_add_subscriptions/`, verified against
  `prisma migrate diff --from-empty` and a clean `db push` on a temp SQLite file.
- **`lib/billing/`** (new, parallel to `lib/payment/` which stays untouched — that's
  tenant-to-landlord rent collection, a separate concern): `plan-limits.ts` encodes the
  landing page's own numbers (Free = 1 property, Pro = 10, Business = unlimited; seat
  limits are recorded but **not enforced** — there's no Org/Team model yet, see 3.2).
  `subscription-service.ts` reuses `paymentService.getStripeClient()` (no duplicate
  Stripe client init), creates Checkout Sessions offering **card + SEPA Direct Debit**
  with **Stripe Tax** turned on (EU VAT per customer country), Billing Portal sessions
  for self-service upgrade/downgrade/cancel, and syncs plan/status from
  `checkout.session.completed` / `customer.subscription.*` webhooks.
- **Routes:** `GET /api/billing/{checkout,portal,subscription}`; extended
  `app/api/webhooks/stripe/route.ts` to dispatch subscription-lifecycle events to the
  new service (payment-intent/charge events keep going to `paymentService`, unchanged).
  Fixed a latent bug in that route's own test mock (`vi.fn(() => ({...}))` isn't a valid
  `new`-constructor) surfaced while adding real dispatch-assertion tests.
- **Gating:** new `PlanLimitError` (`lib/utils/error-handling.ts`, → HTTP 402), checked in
  `app/api/properties/route.ts` right before creation. Gated behind a new
  `ENABLE_BILLING` flag, **off by default** — self-hosted instances are never limited,
  matching the landing page's own "self-hosted is always free" disclaimer.
- **UI:** filled in the Settings page's already-stubbed "Billing" tab
  (`components/features/settings/settings-view.tsx` — it said "coming soon") with real
  plan/status/usage display and upgrade/manage-billing buttons; rewired the landing
  page's Pro ("Start free trial" → was linking to `/demo`) and Business ("Contact sales"
  → was a `mailto:`, recopied to "Get started") CTAs to the new checkout route, all
  three tiers self-serve per product decision. Pro Checkout Sessions get a
  `STRIPE_TRIAL_DAYS_PRO`-configurable 14-day trial so "Start free trial" is literally
  true; Business does not claim one.
- **Auth flow:** `/auth/signin` didn't support a post-login redirect target before this —
  added a `callbackUrl` query param (validated to same-site relative paths only, to rule
  out an open redirect) so an unauthenticated landing-page click lands back on Checkout
  after sign-in instead of always going to `/dashboard`.
- **Env:** `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS`, `STRIPE_TRIAL_DAYS_PRO`,
  `ENABLE_BILLING` documented in `.env.example` and `CLAUDE.md`; `scripts/validate-env.js`
  now requires the two Price IDs when `ENABLE_BILLING=true`.
- **Known gap, resolved by 3.2:** Business's "Team access (up to 5 users)" line item was
  sellable but not enforced. 3.2 decided not to build multi-user sharing now (see below)
  and softened the landing-page copy to "Team access (coming soon)" instead, so nothing
  false is being sold.

### 3.1 — Shipped as: deleted the one genuinely dead duplicate; kept the rest

Investigated what "~2,400 LOC divergence risk" actually referred to before touching
anything — it turned out to be two separate findings, only one of which needed code
changes.

- \*\*The routes (`/portfolio`↔`/properties`, `/people`↔`/tenants`) are not duplicated
  UIs — `/properties` and `/tenants` (and their `[id]` sub-routes) are pure
  `redirect()` stubs to `/portfolio`/`/people`, nothing else. Harmless, standard
  backward-compatibility for old bookmarks/links. Left as-is.
- **The real duplication was `components/features/property/property-detail-modal.tsx`**
  (1,279 lines) — a full read+edit implementation of the property detail 4-zone modal
  pattern that **had zero imports anywhere in the app** (not the barrel `index.ts`, not
  a test file, nothing). The live property-detail flow is
  `property-detail-route-client.tsx` → `property-detail-sheet-client.tsx` →
  `PropertyDetailView` (`property-detail-view.tsx`, 1,154 lines, rendered in a `Sheet`
  from `/portfolio?modal=<id>`) — entirely unrelated code path. Deleted the dead file.
- **Tenant's apparent pair is not a duplication** — `TenantDetailModal`
  (`tenant-detail-modal.tsx`) is the shared add/edit **form**, correctly reused by both
  the tenants list and `TenantDetailView`'s "Edit" button (`tenant-detail-view.tsx:451`
  renders it directly). `TenantDetailView` is the read-only detail page. Different
  concerns, not divergent implementations of the same one — left both as-is.
- **Corrected `CLAUDE.md`'s "4-zone modal pattern" line**, which claimed Property and
  Building detail modals as examples — Property's was the dead file just removed, and
  no `BuildingDetailModal` exists at all. The pattern is real and live for Tenant's edit
  modal and `ticket-detail-modal.tsx` only; updated the doc to say so.

**Milestone 3 exit criteria met:** one implementation per entity/route (confirmed — the
remaining "duplicates" were either harmless redirects or intentionally different
concerns, not drift); identity model decided (3.2: single-account); monetization
validated and wired (3.4); a stated scale plan (3.5); one IA (3.3). All five items of
Milestone 3 are now done.

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
