# Domora (ProMan) — UX / UI / Product-Flow Audit

> Principal-level usability audit of the property-management app for Portugal/Spain
> landlords. Findings are grounded in the actual codebase, not generic advice.
> Companion to the redesign work on branch `claude/ux-audit-redesign-0eygsj`.

Key source files referenced: `lib/portal/access.ts` (nav config),
`app/[locale]/(main)/layout.tsx` (shell), `components/layouts/sidebar.tsx`,
`components/ui/mobile-nav.tsx`, `components/features/dashboard/overview-view.tsx`,
`components/ui/onboarding-checklist.tsx`, `app/[locale]/page.tsx` (landing),
`app/auth/signin/page.tsx`, detail modals under `components/features/*`,
`app/globals.css`.

---

## A. Executive Summary (most critical issues)

1. **Two identities that fight.** UI is branded "Domora" everywhere (sidebar,
   landing, sign-in: *"Welcome to Domora"*) while the repo, routes, cookies and
   metadata say "ProMan/proman". First-time trust is undermined.
2. **Bloated, self-contradictory IA.** ~14 top-level destinations across 3 groups,
   plus a graveyard of orphaned routes (`/overview`, `/properties`, `/tenants`,
   `/vendors`, `/contracts`, `/insights`, `/owners`, `/buildings`) kept alive only
   by `normalizePortalPath`. Labels don't match routes ("Properties"→`/portfolio`,
   "Tenants"→`/people`, "Accounts"→`/financials`, "Vendors"→`/contacts`).
3. **A real navigation bug ships today:** "Vendors" is listed **twice** in
   `PORTAL_NAV_GROUPS` (`lib/portal/access.ts`). It renders duplicated in the sidebar.
4. **Analytics / Reports / Documents / Financials overlap** with no clear
   job-to-be-done split — four "numbers" destinations to mentally disambiguate.
5. **Onboarding stops at a checklist and abandons the user at the hard part.** The
   dashboard shows a 4-step checklist (Property→Tenant→Lease→Payment), but tapping
   "Add Property" drops the user into a 14+ field single-screen modal with zero
   inline help and no required/optional cues. Only *leases* get a wizard — the
   simplest entity (tenant) and the most intimidating (property) do not.
6. **No "aha moment" before commitment.** New users see a blank slate; no
   sample-data seeding. Demo mode exists but is a separate door.
7. **Mobile is responsive, not native.** Good bottom-nav + sheet modals, but tables
   only horizontally-scroll (no card reflow), some tap targets are 32px (`h-8`), and
   the sidebar simply vanishes `<768px` — half the destinations have no real
   mobile entry point.
8. **Tenant portal is second-class.** Token-in-URL access, a static "ask your
   manager" landing, no nav parity. The surface likeliest to drive recurring
   engagement is the least invested.
9. **Detail modals are dense to the point of intimidation** (4 zones × 4 tabs;
   property edit = 24 fields). Power-user friendly, first-run hostile.
10. **Retention plumbing exists but isn't surfaced.** Solid server-side automation
    (rent D-5, overdue D+1/D+7, lease renewal D-60, PT receipt deadlines) + a
    notifications API — but no in-app notification center/bell. The value is
    computed and never shown.

---

## B. Severity Breakdown

### 🔴 Critical (breaks UX, trust, or conversion)
- **C1.** Brand name split: "Domora" vs "ProMan/proman".
- **C2.** Duplicate "Vendors" nav entry renders twice.
- **C3.** Onboarding cliff: checklist → 14-field property modal, no guidance.
- **C4.** No pre-commitment "aha"/sample data; blank dashboard for new users.
- **C5.** IA overload + label/route mismatch + orphan routes.
- **C6.** Mobile secondary nav: 6+ owner destinations have no first-class entry.

### 🟠 Medium (friction, confusion, inefficiency)
- **M1.** Analytics vs Reports vs Financials vs Documents — undifferentiated.
- **M2.** No in-app notification center despite an API + automation engine.
- **M3.** Tenant portal: token-URL, no persistent nav, static landing.
- **M4.** Property/Tenant creation are single dense forms; only Lease is a wizard.
- **M5.** Two competing empty-state treatments shown together.
- **M6.** Tables horizontal-scroll on mobile instead of reflowing to cards.
- **M7.** No inline field help/tooltips outside Settings.
- **M8.** Landing leads with "Sign in" rather than value-prop + "Get started"; no
  visible signup path.

### 🟡 Low (polish)
- **L1.** Some buttons `h-8` (32px) below 44px tap target.
- **L2.** Sidebar group labels ("Operations / Reports / System") are internal jargon.
- **L3.** `data-tour="onboarding"` attribute exists but no tour is wired.
- **L4.** Locale set includes `it` while product scope is PT/ES only.
- **L5.** Detail-modal density: 4 tabs default-open; consider lazy/collapsed tabs.

---

## C. Detailed Findings (problem → impact → fix)

### C1 — Brand identity is split (🔴)
- **Problem:** UI says *Domora*; routes/cookies/repo/package say *proman*.
- **Impact:** First 0–30s trust hit; looks unfinished/templated.
- **Fix:** Standardize user-facing strings + metadata on **Domora**. Leave internal
  route/cookie/package names to avoid breakage.

### C2 — Duplicate Vendors nav entry (🔴, real bug)
- **Problem:** `PORTAL_NAV_GROUPS[0].items` contains two identical "Vendors"→
  `/contacts` objects, both `key:"vendors"` (duplicate React key).
- **Impact:** Sidebar renders "Vendors" twice; signals low quality.
- **Fix:** Delete the duplicate object.

### C3 — Onboarding cliff (🔴)
- **Problem:** The checklist is a good prompt, but actions open standard create
  modals. Property modal = 4 cards / 14+ fields, no inline help, no "required only"
  default. Tenant has progressive disclosure; property — the scariest — does not.
- **Impact:** Highest-friction moment at the highest-stakes moment. Drop-off before
  first value.
- **Fix:** Make "Add your first property" a **3-step guided wizard** reusing the
  existing `MultiStepFormContainer` (already used by leases). Required-first;
  "Add more details" expands the rest. Chain into "Add tenant to this property?".

### C4 — No pre-commitment aha / blank dashboard (🔴)
- **Problem:** New users get an empty dashboard. Demo mode is a separate door.
- **Impact:** No emotional payoff; the dashboard "comes alive" only after 4 manual
  create flows.
- **Fix:** Offer **"Load sample portfolio"** one-click seed on the empty dashboard,
  with a persistent "Clear sample data" banner.

### C5 — IA overload, label/route mismatch, orphan routes (🔴)
- **Problem:** 14 owner destinations; labels ≠ routes; legacy pages still exist;
  group labels are internal ("Operations/Reports/System").
- **Impact:** Cognitive load; ambiguous "where do I find X"; dead pages.
- **Fix:** Consolidate to a **task-based IA** (section D). Align labels↔routes; add
  redirects; delete orphan routes; rename groups to "Manage / Money / Compliance."

### C6 — Mobile secondary navigation is a dead-end (🔴)
- **Problem:** Only `mobilePrimary` items appear in bottom nav; the rest are crammed
  into a user strip, not a menu.
- **Impact:** On phones, half the app is functionally hidden.
- **Fix:** Add a **"More" tab** opening a full-height sheet listing the remaining
  destinations — `getSecondaryMobileNavigation()` already returns exactly this set.

### M1 — Numbers destinations undifferentiated (🟠)
- **Fix:** Collapse Analytics + Reports into one **"Insights"** with tabs (charts vs
  exportable statements). Financials = ledger; Documents = file store. One-line
  subtitle on each stating its job.

### M2 — No notification center (🟠)
- **Fix:** Add a **bell** with unread count fed by the existing API, deep-linking to
  the entity. Cheapest retention lever available — the data already exists.

### M3 — Tenant portal underbuilt (🟠)
- **Fix:** Persistent bottom nav (Home / Pay / Requests / Documents), in-context
  magic-link landing, real "pay rent / see receipt" primary action.

### M4 — Inconsistent creation patterns (🟠)
- **Fix:** Required-first progressive forms for Tenant; guided wizard for Property
  and Lease. One creation philosophy.

### M5 — Competing empty states (🟠)
- **Fix:** Show *one* primary empty state (the checklist); demote feature cards.

### M6 — Tables on mobile (🟠, mostly already handled)
- **Update after deeper review:** The leases, maintenance, tenants and property
  views already default to a card ("grid") view via the shared `DataViewToggle`
  and persist the choice; "table" is an opt-in power-user mode. So the
  first-run mobile experience is already card-based, not a cramped table.
- **Remaining gap / fix:** When a user explicitly picks "table" mode, prefer the
  card view on small viewports so the saved desktop preference doesn't produce a
  pinched table on a phone. Low priority given the mobile-friendly default.

### M7 — No inline help (🟠)
- **Fix:** Concise helper text under non-obvious fields (tax regime, deposit,
  renewal notice days, NIF/IBAN) + required/optional affordance. Settings already
  models this (`fiscalResidencyHelp`).

### M8 — Landing leads with the wrong CTA + no signup (🟠)
- **Fix:** Primary CTA = "Get started / See the demo"; secondary = "Sign in".
  Expose a real signup path. Lead with the outcome above the fold.

### Low items
- **L1** bump `h-8` action buttons to `h-9`/`h-10` on touch. **L2** rename nav
  groups. **L3** wire or remove the tour stub. **L4** drop `it` locale. **L5**
  lazy-render secondary modal tabs.

---

## D. Rebuild Suggestions

### Redesigned IA (task-based, owner)
```
PRIMARY (bottom nav + sidebar top):
  Home        → dashboard (action panel + KPIs + notifications)
  Properties  → portfolio (+ units/buildings folded in as filters/tabs)
  Tenants     → people (vendors/owners as filter tabs, not separate nav)
  Money       → financials (receipts, expenses, ledger) + "Insights" tab
  More        → sheet: Maintenance, Leases, Documents, Messages, Compliance, Tax, Settings
```
14 destinations → 5 primary + a grouped "More". Vendors/Owners/Buildings/Units
become filters inside their parent, not top-level nav. Delete orphan routes.

### Improved onboarding flow
```
Signup (Google or email)
  → 1-question setup: "How many units & which country?" (prefills defaults)
  → Empty dashboard with ONE choice:
       [Add my first property]  or  [Load sample portfolio to explore]
  → Guided 3-step property wizard (reuse MultiStepFormContainer)
  → "Add a tenant to <property>?" inline chain
  → Dashboard populates → checklist celebrates → notification bell now meaningful
```

### "Ideal version" in one line
A landlord opens the app, instantly sees *"€X collected, €Y overdue, 2 things need
you today,"* taps the one overdue tenant, sends a reminder in two taps, and closes
the app. Everything else is one level deeper.

---

## E. The "One Screen Test" — perfect first screen (post-login Home)
1. **One sentence of state, top:** "June: €4,200 collected · €600 overdue · 96%
   occupied" (already computed in `overview-view.tsx`).
2. **A single "Needs you today" stack** (max 3) with inline one-tap actions — the
   existing Action Panel, promoted to hero. Empty → "You're all caught up."
3. **One primary CTA** matched to the user's stage: first-run → "Add your first
   property"; steady-state → "Record a payment."
4. **A live notification bell** with unread count — proof the app is working while
   the user is away.
5. **Nothing else above the fold.** Charts, tables, reports live one tap down.
   Trust = clarity in under 5 seconds.
