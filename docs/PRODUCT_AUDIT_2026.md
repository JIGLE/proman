# Lares — Product, Architecture & Behavioral Audit (2026)

**Status:** Strategy layer above the existing UX/engineering docs. **Scope:** full-app
audit across architecture, purpose, user psychology, and adjacent dimensions, with one
north star — _make Lares as essential (habit-forming, hard to leave) as possible for
the end user._ **No code changes**; this document is analysis + a prioritized roadmap.

> **How this relates to existing docs.** `docs/UX_AUDIT_2026.md`,
> `docs/UX_IMPROVEMENT_PLAN.md`, and `docs/UI_CONSISTENCY_GUIDE.md` already cover
> UX/IA critique; `docs/DESIGN_AWARD.md` owns visual/token quality; the accessibility
> docs own WCAG. This audit does **not** restate them — it sits _above_ them and answers
> the strategic question they don't: _what makes the product indispensable, and what's
> in the way._ Where it touches IA or design, it defers to those docs.

---

## 1. Executive summary — the thesis

Lares's positioning is unusually sharp and correct: **"Collect rent. Issue receipts.
Stay compliant."** (`messages/en.json` landing block; `app/[locale]/page.tsx`). The
product already owns a genuine moat — the **deadline-driven compliance + rent-collection
loop** for PT/ES landlords. That loop is both a real utility (missing a _recibo de renda_
has legal consequences) and a real switching cost (a landlord who runs fiscal compliance
through Lares can't casually leave). The engineering foundation under it is sound.

**The gap between "useful" and "indispensable" is mostly wiring, not invention.** Four
things separate today's Lares from a product a landlord _cannot_ operate without:

1. **The loop's triggers never leave the app.** Every automated reminder writes an
   in-app notification only — no email, no push. The product can reward a user who is
   already inside, but it cannot _pull them back_. This is the single highest-leverage
   fix. (§4, verified §7-A.)
2. **Engagement mechanics are built but dead.** Achievements exist in code and are
   never rendered; the more compelling "attention" component is unused; demo auto-play
   workflows may not be surfaced. Investment/reward loops are half-wired. (§4.)
3. **The tenant portal is a second-class surface** — the most viral part of the product
   (every tenant is a branded impression) is the least polished. (§4, §5.)
4. **A trust-critical claim the code doesn't keep:** PII field encryption is _defined
   but not wired in_. A compliance product storing NIFs/IBANs in plaintext is an
   existential trust risk, not a backlog item. (§6, verified §7-A.)

Everything else in this document ranks below those four.

---

## 2. Purpose & positioning

|                         |                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**          | Self-hosted property-management SaaS for landlords/managers in **Portugal & Spain** (`README.md`, `CLAUDE.md`).                                                                                      |
| **Core job-to-be-done** | Close the **monthly rent → receipt → fiscal** loop, compliantly, with the least effort. The landing page names this exactly: _"Three steps to close the collection loop."_                           |
| **Primary user**        | The **solo / small PT-ES landlord** (the codebase is explicitly biased to this — e.g. free-text vendor names because "free-text covers 90% of solo-landlord use cases," `ROADMAP.md` Decisions Log). |
| **Secondary user**      | The **tenant** — narrow, transactional JTBD: see rent due, pay it, report an issue, get documents.                                                                                                   |
| **Competitive framing** | Implicit and good: _"A single workflow, not a fragmented dashboard,"_ plus a self-hostable / open-source angle.                                                                                      |

**The strategy layer that's missing.** The documented corpus is rich on UX and
engineering but **silent on product strategy**: there is no North-Star metric, no
activation/retention instrumentation for the authenticated app, no personas or user
research, and **the pricing tiers are unbacked marketing copy** — a code search finds no
Stripe subscription/price wiring; Stripe is used only for rent collection. Free/Pro/
Business plans render on the landing page but nothing gates on them. This is not a bug,
but it means the business currently has **no monetization mechanism and no way to measure
whether it's becoming essential.** (§8 proposes a North-Star; §9 the metric gap.)

---

## 3. User psychology — the habit model

Mapping Lares onto a standard hook loop (**Trigger → Action → Variable reward →
Investment**) locates every behavioral strength and gap precisely.

**Trigger — the broken link.** The external trigger is _missing_. Reminder automation
(`lib/services/notifications/notification-automation.ts`) generates: rent reminder D-5,
overdue D+1/D+7, lease-renewal D-60, and the PT _recibo_ 5-day deadline — but every path
ends in `prisma.notification.create(...)` (lines 67, 128, 185, 268) and **nothing emails
or pushes**. A habit needs an external trigger that arrives when the app is closed; today
the app can only nudge users who already opened it. **This is the #1 behavioral fix.**

**Action — strong.** The `ActionPanel` (`components/features/dashboard/action-panel.tsx`)
is the best asset in the product: a live, prioritized worklist (critical/warning/info)
with deep links. Low-friction, obvious next action. Keep and centralize it.

**Variable reward — partially realized.** The "**all clear**" inbox-zero state
(`action-panel.tsx`, the `allClear` branch) is a genuine, satisfying reward — the core
loop is _open → triage → clear → green check_. But:

- **Achievements are dead code.** `components/ui/achievements.tsx` (Full Occupancy,
  Perfect Payments, etc.) is **never imported anywhere** (verified §7-A). Zero
  gamification ships today.
- Even the built rewards are **one-time milestones**, not **streaks/consistency**
  mechanics — and streaks, not badges, drive habit. "6 months of on-time compliance"
  is a far stronger reward than a one-off badge.

**Investment — under-leveraged.** Users invest by entering portfolio data (good: sunk
cost = retention). But the activation ladder (`components/ui/onboarding-checklist.tsx`)
is **dismissible permanently per-browser via `localStorage`** with **no server-side
activation tracking** — a user who dismisses early loses the ladder forever, and the
business can't measure or re-drive activation.

**Recommendation.** The loop is 70% built. Completing it = external triggers (email/push
off the _existing_ automation) + streak-based rewards + server-side activation state.
None of this is new invention.

---

## 4. Architecture assessment

**Solid (do not disturb).** Clean controller → service → Prisma layering; a single
generic CRUD factory (`lib/contexts/create-entity-actions.ts`) that kills ~500 LOC of
boilerplate; **compliance-as-data** (`TaxRule` stores PT/ES legislation as versioned
JSON keyed by country/regime/year); versioned, audited income-split ledger
(`IncomeDistribution`); and a real security posture (nonce CSP, CSRF, rate-limiting,
audit logs, MFA). The domain model is genuinely well-thought — composite indexes tuned
to query paths, a rich `Lease`/`Receipt`/fiscal object graph.

**Risks / what would resist change:**

| Risk                                      | Evidence                                                                                                                                             | Consequence                                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`User`-rooted single-account identity** | `prisma/schema.prisma`: every entity FKs `userId`; **no Org/Team entity**; `Tenant.email`/`Owner.email` are **globally unique**.                     | Any future multi-landlord agency / team feature is a schema-and-every-query rewrite; two landlords can't share a tenant email today.                                 |
| **Load-everything state**                 | `lib/contexts/use-app-data.ts` fetches all ~10 collections in one `Promise.all` on mount, unpaginated, for every authenticated page.                 | Fine for 12 properties; will not scale to a large portfolio. One context = one re-render domain (no selectors).                                                      |
| **SQLite with in-DB BLOBs**               | `Lease.contractFile Bytes?` stores PDFs in the DB; JSON-in-`String` columns proliferate.                                                             | A Postgres/JSONB migration (needed for scale/analytics) touches many services.                                                                                       |
| **Duplicated entity-detail UIs**          | Property has `property-detail-modal.tsx` (1279 LOC) **and** `property-detail-view.tsx` (1154 LOC) — two parallel implementations; tenant repeats it. | ~2,400 LOC kept in sync by hand; every property-detail change is done twice or diverges. (This session already hit it: a token migration had to be applied to both.) |
| **Duplicate routes / conventions**        | `/portfolio`+`/properties`, `/people`+`/tenants`; root-level `components/*-detail.tsx` beside `components/features/*`.                               | Two names for the same thing; onboarding/maintenance friction.                                                                                                       |

---

## 5. Additional audit dimensions

Beyond the three core lenses, the dimensions below materially affect whether Lares
becomes essential. Ordered by leverage.

**Security, privacy & compliance integrity — highest concern.** `lib/utils/pii-encryption.ts`
defines `PII_FIELDS` (Owner/Tenant/PaymentMethod NIFs, IBANs, phones; RentReceipt/NRUA
NIFs) and an AES-256-GCM `encryptPII`/`decryptPII`. **But those functions are imported
only by the three TOTP auth routes** — not by any Owner/Tenant/PaymentMethod/receipt
service (verified §7-A). So the field-level encryption the code _advertises_ is not
applied: **NIFs, IBANs, and phone numbers are stored in plaintext today.** For a product
whose entire value proposition is fiscal correctness and trust, this is the top risk —
both GDPR exposure and a credibility gap between what the code claims (`PII_FIELDS`) and
what it does. Also note `encryptPII` silently returns plaintext if no key is set
(safe-ish default, but easy to ship unencrypted).

**Trust & credibility.** The product asks landlords to route legally-required filings
through it (AT electronic receipts, Modelo 179, NRUA). Trust _is_ the product. The
plaintext-PII gap, `MB WAY`/`Bizum` shipped as "documented placeholders" with no
provider (`ROADMAP.md`), and `alert()` dialogs on the tenant payment path all quietly
erode the "you can trust us with your compliance" promise. Trust debt compounds faster
than feature debt here.

**Localization / i18n completeness.** Lares runs 4 locales (pt default, en, es, it).
But several **behavioral** surfaces are hardcoded English in a PT/ES market:
`insights-view.tsx`, `payment-matrix-view.tsx` (month abbreviations), `notification-center.tsx`
("Mark all read", "Just now", "You're all caught up!"), the `onboarding-checklist.tsx`
completion copy (English at the emotional peak of activation), `empty-state-illustrations.tsx`,
and the dead `achievements.tsx`. The **tenant portal is a nuance**: contrary to earlier
notes, it _does_ use `useTranslations` for its copy (`app/tenant-portal/[token]/page.tsx:103-104`)
— its real gaps are **hardcoded `pt-PT`/EUR formatting regardless of locale** (lines
248, 251) and a raw English `alert()` fallback, not missing translation wiring.

**Growth & virality.** The tenant portal is the only surface that touches non-customers
— every rent-paying tenant is a branded impression and a potential future landlord. Yet
it uses a hardcoded gray/blue Tailwind palette (not the Lares design tokens, so it won't
theme/dark-mode), `alert()` for payment feedback, and token-only access with no recovery
(lose the email, lose access). Bringing it to parity converts the biggest untapped
acquisition channel; leaving it undercuts the brand at its most public point.

**Performance & scalability.** Covered in §4 (load-everything context, SQLite BLOBs).
Not urgent for the solo-landlord target, but it caps the "agency with 200 units" upsell
that the "Business" tier implies.

**Reliability & observability.** Infra metrics exist (`/api/metrics`, Prometheus-style),
but there is **no product analytics** for the authenticated app — only a landing-page
funnel (`components/shared/landing-analytics.tsx`). You cannot currently answer "are
users forming the habit?" (§9).

**Maintainability / doc integrity.** Version drift across sources (package.json 1.15.0
vs CLAUDE.md 1.14.1 vs README 1.13.0 vs ROADMAP 1.16.0/1.12.1); `ROADMAP.md` is
physically duplicated; `CLAUDE.md` cites wrong paths (`lib/encryption.ts`, wrong env var,
missing `it` locale); legacy `next-i18next.config.js` disagrees with the live next-intl
config. Low user impact, real contributor-onboarding friction — and it makes it hard to
know what actually shipped (below).

---

## 6. Reconciling the existing docs

> **Superseded (2026-07, see `ROADMAP.md` Decisions Log 2026-07-09 and
> `docs/ARCHITECTURE_GOVERNANCE_AUDIT_2026.md` §1).** The recommendation below to adopt
> the **task-oriented** IA was **overruled**: the Operations/Intelligence(Reports)/System
> IA from `UX_AUDIT_2026.md` was already live in `lib/portal/access.ts` and was adopted as
> canonical; the task-oriented proposal was self-flagged as XL/multi-sprint and never
> validated. Likewise the "Critical items largely unshipped" claim below predates the
> M0.1 status reconciliation and is stale — nav consolidation shipped (though the live
> sidebar has since grown to 14 items; see the architecture/governance audit). The
> section is kept for provenance; treat the Decisions Log as authoritative for IA.

**Three conflicting IA visions coexist** and should be collapsed to one:

- `UI_CONSISTENCY_GUIDE.md` — 7-item Assets / People / Finance / Insights model.
- `UX_AUDIT_2026.md` — 8-item OPERATIONS / INTELLIGENCE / SYSTEM model.
- `UX_IMPROVEMENT_PLAN.md` §3.1 — task-oriented "Collect Rent / Contracts & Documents".

**Recommendation:** adopt the **task-oriented** framing. It is the only one that matches
the product's own positioning ("close the collection loop") and the habit thesis of this
audit — navigation should mirror the jobs (collect rent, stay compliant, manage
contracts), not the entity taxonomy. Fold the other two into it and delete the losers so
one IA is authoritative.

**What was recommended vs what appears shipped.** `UX_AUDIT_2026.md` (May 2026) flagged
tenant-portal i18n and nav consolidation as **Critical (C1-C4)**. `DESIGN_AWARD.md`
(Jul 2026) still calls the tenant portal the "worst offender," and duplicate routes
(`/portfolio`+`/properties`) still exist — so **the Critical items appear largely
unshipped.** Before planning new work, the team should mark the existing backlog's real
status; this audit assumes those items are still open.

---

## 7. Verification of the sharpest claims

### 7-A. Verified against source (this session)

- **PII encryption not applied:** `grep encryptPII|decryptPII` → only `pii-encryption.ts`
  (definition) + `app/api/auth/totp/{enable,setup,verify}/route.ts`. No Owner/Tenant/
  PaymentMethod/receipt service imports it. ✅ Confirmed plaintext.
- **Achievements dead:** `grep AchievementGrid|AchievementBadge` → only
  `components/ui/achievements.tsx` itself. ✅ Confirmed never rendered.
- **Reminders in-app only:** `notification-automation.ts` contains 4×
  `prisma.notification.create` and **no** `sendEmail`/SendGrid calls. ✅ Confirmed.
- **Tenant portal:** hardcoded palette + `pt-PT`/EUR + `alert()` confirmed
  (`[token]/page.tsx:248,251,277-279,298,306`); **i18n IS wired** (`:103-104`) —
  earlier "zero i18n" claim corrected.

---

## 8. Proposed North-Star & guardrails

Lares has no North-Star metric. Proposed:

> **North-Star: on-time compliant rent cycles closed per active landlord per month** —
> the count of (rent collected **and** receipt issued **and**, where required, filed) on
> time. It captures the full loop, is the thing users actually value, and rises only when
> the product is genuinely doing its job.

**Input metrics** (what to move): activation rate (first property → first lease → first
receipt), % of due rent marked collected on time, % of receipts issued within the legal
window, reminder→action conversion, and streak length (consecutive compliant months).
**Guardrail metrics:** notification opt-outs, time-to-first-value, tenant-portal payment
success rate.

---

## 9. The instrumentation gap

You cannot currently measure any of §8. There is landing-funnel tracking
(`landing-analytics.tsx`) but **no authenticated-app product analytics** and no
server-side activation state. Making Lares essential requires being able to _see_ the
habit forming. Minimum: an events table / lightweight analytics for the core loop
(activation steps, rent-marked-paid, receipt-issued, reminder-clicked) and a server-side
activation record (replacing the `localStorage`-only onboarding dismissal).

---

## 10. Prioritized "make-it-essential" roadmap

Impact × effort, mapped to files. **This audit recommends nothing be built until the
existing UX_AUDIT_2026 Critical items' real status is confirmed (§6).**

### P0 — Now (essential & trust; small-to-medium effort)

| Item                                                                   | Why                                                                        | Where                                                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Wire PII encryption** to Owner/Tenant/PaymentMethod/receipt services | Closes a plaintext-NIF/IBAN GDPR + trust gap; makes an existing claim true | `lib/utils/pii-encryption.ts` (`PII_FIELDS`) → the entity services               |
| **Route reminders to email (and later push)** off existing automation  | Completes the habit loop's external trigger — highest behavioral leverage  | `lib/services/notifications/notification-automation.ts` + `lib/services/email/*` |
| **Add core-loop product analytics + server-side activation**           | Enables measuring the North-Star; unblocks everything else                 | new events sink; replace `onboarding-checklist.tsx` localStorage dismissal       |

### P1 — Next (habit & reach; medium effort)

| Item                                                                                                                 | Why                                                          | Where                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Tenant-portal parity** — design tokens, locale-aware currency/date, replace `alert()` with real UI, durable access | Converts the biggest viral surface                           | `app/tenant-portal/[token]/page.tsx`                                                                           |
| **Activate-or-delete engagement code**; convert rewards to **streaks**                                               | Turns dead code into a real reward loop; streaks drive habit | `components/ui/achievements.tsx`, `quick-actions.tsx`, `lib/demo/demo-scenarios.ts`                            |
| **i18n the behavioral surfaces**                                                                                     | Trust/retention in PT/ES                                     | `insights-view.tsx`, `payment-matrix-view.tsx`, `notification-center.tsx`, onboarding completion, empty states |
| **Collapse duplicate attention surfaces** (Insights ↔ dashboard) into the one `ActionPanel` loop                     | One clear daily loop, not diluted                            | `insights-view.tsx`, `overview-view.tsx`                                                                       |

### P2 — Later (coherence & scale; larger effort)

| Item                                                                          | Why                                       | Where                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| **Consolidate duplicated entity-detail UIs & routes**                         | Removes ~2,400 LOC of divergence risk     | property/tenant modal+view; `/portfolio`↔`/properties`     |
| **Decide the identity model** (stay single-account vs plan for org/team)      | Determines the "Business/agency" ceiling  | `prisma/schema.prisma`                                     |
| **Adopt one IA** (task-oriented) & delete the other two visions               | One authoritative navigation              | the three IA docs                                          |
| **Validate & wire monetization** (or commit to open-source-first)             | The tiers are currently unbacked copy     | Stripe subscription wiring                                 |
| **Fix doc integrity** (dedupe ROADMAP, reconcile versions, correct CLAUDE.md) | Contributor onboarding; know what shipped | `ROADMAP.md`, `CLAUDE.md`, remove `next-i18next.config.js` |

---

## 11. Bottom line

Lares is a technically strong product sitting on a correct, defensible thesis. It is
**one loop-completion away** from essential: make the compliance/rent reminders _leave
the app_, make the reward a _streak_ worth protecting, make the tenant surface _worthy of
the brand_, and make the compliance promise _true_ (encrypt the PII). Do those four, in
that order, and Lares becomes the tool a PT/ES landlord opens every month because the
cost of not opening it is a missed legal deadline — the definition of essential.
