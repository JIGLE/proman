# Goal-Fitness Review — Lares vs its promise, as a human user (2026-07)

> **Method.** Unlike the four prior audits (product, UX/IA, mobile, architecture/governance),
> which read the code, this review **used the app**: a fresh `dev.db` (exactly what a new
> self-hosted install gets), a real credentials sign-in, and Playwright driving every journey
> the marketing promises — landlord and tenant, desktop (1440px) and mobile (390px). Every
> verdict below was observed live in the browser, with network/console capture, and is
> root-caused to a `file:line`. Where a step could not be exercised (SendGrid email, Stripe,
> file upload), it is marked _not testable locally_ rather than guessed. Version: **1.16.2**.
>
> **The yardstick** is the product's own words: hero **"Collect rent. Issue receipts. Stay
> compliant."** (`messages/en.json:362-372`); README's "Recibos de Renda Eletrónicos … AT-
> compatible XML" (`README.md:28`); the onboarding checklist's prescribed first-run
> (property → tenant → lease → payment, `overview-view.tsx:347-384`).

## Verdict

**The app does not currently deliver its core promise to a human user.** The backend is
sound — every API I called with correct inputs returned 201/200 — but the client layer
breaks each step of the hero loop: the guided first-run dies after step 1, **no path in the
UI can create a lease** (the wizard crashes and then bricks the Contracts page), **no path
in the UI can record a payment** (the only dialog always 400s on its own defaults), and the
owner **cannot generate a tenant-portal invite** (the button calls the API with the wrong
HTTP method). Meanwhile the demo — the version a prospect sees — works smoothly. The product
currently _demos better than it works_, which is the most dangerous trust profile for a
compliance tool.

The encouraging part: the breakage is **shallow**. These are wiring defects (a missing
`method: "POST"`, a date-format mismatch between one form and its own API, unstable effect
dependencies, an entrance animation that never fires) — not architectural flaws. The domain
model, the triage dashboard concept, the compliance hub, maintenance, mobile navigation, and
the tenant portal's content are all genuinely good once reached. One focused fix sprint
separates the current state from the promise.

## Journey scorecard

| #   | Journey (the promise)                                      | Verdict                          | What actually happened                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | First impression / "guided walkthrough in under 2 minutes" | **Friction**                     | A full-screen language gate blocks everything before any pitch. Demo entry is fast and the triage dashboard is compelling — but static fixture dates make the demo open as a portfolio in crisis ("9 of 9 leases unpaid", a 118-day-old ticket, payments dated April in July).                                                                                                                                                                                                               |
| 2   | First-run onboarding (property → tenant → lease → payment) | **Broken**                       | Checklist renders in Portuguese on `/en` with mixed strings ("1 of 4 concluído"). Step 1's deep-link (`?action=create-property`) doesn't open the form. After step 1, the checklist goes **invisible** (stuck at `opacity: 0`, buttons dead under an overlapping card). Step 2 (tenant) 500s on the minimal path. Steps 3–4 are broken outright (below).                                                                                                                                     |
| 3   | **Collect rent → issue receipt** (the hero)                | **Broken**                       | "Record payment" is a silent no-op on the default Financials tab. Once found (Receipts tab), the dialog's own default date is rejected by its own API — **every submission 400s**. No other UI path records a payment. After a receipt was API-injected, the dashboard showed "€950 collected this month" and "1 of 1 leases not paid this month" side by side.                                                                                                                              |
| 4   | Stay compliant (AT receipts, IRS/IRPF, Modelo 179)         | **Falls short**                  | The Compliance hub is the best-designed area: Modelo 179 tracks the new lease immediately, per-lease AT status + CSV export; the 5-step tax wizard is coherent, PT-first, and auto-fills honestly from receipts. But a fresh install computes **€0 tax** (TaxRule table empty; seeding undocumented), the flagship AT rent-receipt endpoint **has no UI at all**, the per-receipt PDF is a generic English "PAYMENT RECEIPT", and bulk receipt generation fails 403 **with no error shown**. |
| 5   | Maintenance tracking                                       | **Delivers**                     | The healthiest flow. Clean create form → 201 → 4-zone detail modal → status transition PUT 200. Minor: the modal header still said OPEN after "Mark In Progress"; resolve→auto-expense not fully exercised.                                                                                                                                                                                                                                                                                  |
| 6   | Tenant self-service portal                                 | **Broken from UI / good inside** | The owner's "Portal Link" button sends **GET to a POST-only route (405 every time)** and reads a field the API doesn't return — a landlord cannot invite a tenant. The invite copy also promises 30-day validity; tokens last **7 days**. The portal itself (reached via API-minted link) is clean, formatted, mobile-safe, with a working "Report an Issue" — but shows payment status "pending" despite the paid receipt, and the email row is labeled "Phone number".                     |
| 7   | Tenant role in-app (demo perspective)                      | **Delivers**                     | Correctly filtered nav (Dashboard/Properties/Accounts/Leases/Documents), calm "Tenant workspace" with next rent, status, lease end.                                                                                                                                                                                                                                                                                                                                                          |
| 8   | Mobile                                                     | **Delivers**                     | Single bottom bar + "More" sheet exposing all secondary nav (verified with a real session); zero horizontal overflow on dashboard, financials, portfolio, and the portal at 390px.                                                                                                                                                                                                                                                                                                           |

## The five hard blockers (all new — none caught by the four code-reading audits)

| #   | Blocker                                                                                                                                                                                                               | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Fix size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Lease create/edit/renew crashes the page** ("Maximum update depth exceeded") and a poison `lease-wizard-draft` in localStorage makes the **entire Contracts page crash on every reload** until site data is cleared | Inline `initialFormData` + `persistence` object literals used as effect deps → load-draft/save-draft effects feed each other. `lib/hooks/use-multi-step-form.ts:137-175`, `leases-view.tsx:123,216`. Edit and Renew route into the same wizard (`leases-view.tsx:406-420`) — confirmed crash via `?action=edit` too                                                                                                                                                       | XS       |
| 2   | **Recording a payment is impossible in the UI**                                                                                                                                                                       | (a) header button no-ops when the Receipts tab isn't mounted — `receiptsViewRef.current?.openDialog()` on a null ref, `financials-container.tsx:144`; (b) the dialog's `<input type=date>` sends date-only while the route's private schema demands `z.string().datetime()` — `app/api/receipts/route.ts:26` vs the shared `lib/schemas/receipt.schema.ts:8` (which accepts it). The schema file's own header says it exists "to prevent validation mismatches and drift" | XS       |
| 3   | **Tenant create 500s on the minimal path** (name+email — exactly what the dialog encourages)                                                                                                                          | Empty optional lease fields become `new Date("Invalid Date")` in `tenant.create` (server log: `Invalid value for argument leaseStart`); works only when "Add lease & contact details" is expanded and filled                                                                                                                                                                                                                                                              | XS       |
| 4   | **Owner cannot generate a tenant-portal link**                                                                                                                                                                        | Button fetches with **GET** (no `method`) against a POST-only route → 405; then reads `data.portalUrl` while the API returns `portalLink` — `tenant-detail-view.tsx:100-112` vs `app/api/tenants/[id]/portal-link/route.ts`. Also 30-day copy vs 7-day `TOKEN_EXPIRATION` (`tenant-portal-auth.ts:12`)                                                                                                                                                                    | XS       |
| 5   | **The guided first-run self-destructs**                                                                                                                                                                               | Onboarding checklist entrance animation never completes → stuck `opacity: 0`, buttons covered (`onboarding-checklist.tsx:123-127`; measured live); checklist deep-link `?action=create-property` ignored by the portfolio page                                                                                                                                                                                                                                            | S        |

## Promise vs reality

| Marketing claim                                     | Reality (observed)                                                                                                                                                                                                                                                                                               | Ref                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| "Collect rent. Issue receipts."                     | Neither is achievable through the UI (blockers 1–2). Receipt list shows raw CUID as "Receipt #"; per-receipt actions hidden behind an unlabeled kebab; PDF is a generic English "PAYMENT RECEIPT" (`receipts-view.tsx:174-216`), not a Recibo de Renda                                                           | hero `en.json:362`                |
| "AT electronic receipts … AT-compatible XML"        | `/api/compliance/rent-receipts` has **zero UI callers** (grep across `components/`) — API-only, invisible to users                                                                                                                                                                                               | `README.md:28`                    |
| "IRS / IRPF tax exports"                            | Wizard works mechanically, but a fresh install computes **€0 due** — TaxRule table ships empty, `prisma/seed-tax-rules.ts` is mentioned nowhere in README/docs                                                                                                                                                   | `lib/fiscal/pt-plugin.ts:117-134` |
| "Guided walkthrough in under 2 minutes"             | Demo: plausible. Real first-run: the guide dies after step 1 (blocker 5) and steps 2–4 are broken (blockers 1–3)                                                                                                                                                                                                 | `overview-view.tsx:347`           |
| "Tenant self-service portal, secure JWT"            | Portal content good; the _invitation_ path is broken (blocker 4); copy overstates token life 4×                                                                                                                                                                                                                  | `tenant-portal-auth.ts:12`        |
| "For landlords in Portugal and Spain" (EN/PT/ES/IT) | Signed-in app **ignores the URL locale**: `/en/...` renders Portuguese chrome (`html lang="pt"`) unless a landing-page cookie exists; most screens mix PT and EN ("Payments … Matriz de Acompanhamento"); sign-in claims "enter any credentials" but only one pair works (`signin/page.tsx:207` vs `auth.ts:80`) | `lib/i18n/config.ts:17`           |

## CRUD & detail-surface matrix

✅ works · ⚠️ works with friction · ❌ broken · ➖ not exercised (`n/t` = not testable locally)

| Entity             | Create | Read (detail) | Update | Delete | Notes                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------ | ------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Property           | ⚠️     | ⚠️            | ➖     | ➖     | Create blocked when geocoder unreachable _unless_ manual fields filled — the misattributed "Invalid postal code format" fires on an **empty optional** field. Detail sheet (6 tabs, good stats) opens **only** via `?modal=` deep link — clicking the portfolio card did nothing; sheet has **no Edit action** |
| Tenant             | ❌/⚠️  | ✅            | ➖     | ➖     | Minimal create 500s (blocker 3); expanded create works. Detail modal (3 tabs) + full page both good, but the page leaks raw ISO dates ("Ends 2027-06-30T00:00:00.000Z")                                                                                                                                        |
| Lease              | ❌     | ⚠️            | ❌     | ➖     | Create/Edit/Renew all crash (blocker 1). Detail page works but titles itself with a raw CUID ("Lease cmrhlssr") + raw ISO dates                                                                                                                                                                                |
| Receipt            | ❌     | ⚠️            | ➖     | ➖     | Dialog always 400s (blocker 2); "Amount ($)" label in a EUR product; amount doesn't prefill the lease rent; actions behind an icon-only "Receipt options" kebab                                                                                                                                                |
| Expense            | ✅     | —             | ➖     | ➖     | Works; category dropdown shows raw enum values (`imi ibi stamp_duty building_insurance…`)                                                                                                                                                                                                                      |
| Owner              | ✅     | ✅            | ➖     | ➖     | Clean 5-field dialog, 201                                                                                                                                                                                                                                                                                      |
| Vendor/Contact     | ❌     | ⚠️            | ➖     | ➖     | **"Add Vendor" opens nothing** (confirmed twice, incl. role-based click). The Prestadores tab embeds a full page-within-a-page (second header + 4 more stat tiles + second filter bar)                                                                                                                         |
| Maintenance ticket | ✅     | ✅            | ✅     | ➖     | Best-in-app; stale status header after transition                                                                                                                                                                                                                                                              |
| Building           | ➖     | ❌            | ➖     | ➖     | `BuildingsView` exists but `/buildings` is **bounced to the dashboard** by the access guard (not in the nav config) — stranded feature. Same for `/owners` and `/insights`; `/contracts` (5-tab view) also guard-bounced                                                                                       |
| Document           | n/t    | ✅            | —      | ➖     | Good empty state (Generate/Upload); upload not exercised                                                                                                                                                                                                                                                       |
| Correspondence     | n/t    | ✅            | —      | ➖     | Good empty state; template flow present; send = SendGrid, n/t                                                                                                                                                                                                                                                  |

## Data-coherence gaps (trust killers for a compliance product)

- "€950 collected this month" and "1 of 1 leases **not paid** this month" on the same
  dashboard, simultaneously.
- Payment matrix: "Total Esperado €0,00" for a tenant with an active €950/mo lease;
  "Taxa de Cobrança **NaN%**" (unguarded divide-by-zero, `payment-matrix-view.tsx:340`).
- Occupancy 0% / property "vacant" with an assigned tenant and an active lease — property
  status never follows tenancy.
- Tenant portal: payment status "pending" after the month's rent was received.

## What the prior audits got right — and what only usage revealed

`PRODUCT_AUDIT_2026.md`'s habit thesis (trigger → action loop) is validated on the trigger
side — the triage panel and its link to Financials work — but usage shows the **action** is
unexecutable (blocker 2), which no amount of engagement mechanics can compensate.
`MOBILE_UX_AUDIT.md` / `ARCHITECTURE_GOVERNANCE_AUDIT_2026.md` fixes are visibly effective
(single bottom bar + More sheet, Compliance hub sub-nav — all verified working here).
`UX_AUDIT_2026.md`'s duplicate-surface critique shows up live (Vendors page-within-a-page;
property sheet-vs-modal split where the sheet lacks Edit).

**What none of them caught:** blockers 1–5, the locale failure, the €0 fresh-install tax
engine, and the demo-vs-real divergence — because they read code instead of using the app.
The repo has 93% unit-test coverage and a zero-warning lint gate, yet its four most
important user flows fail. The E2E suite checks that endpoints _respond_
(`e2e/compliance-endpoints.spec.ts` asserts auth/404s), not that a human can complete a
journey. **Recommendation: add four Playwright journey tests (first-run, record payment,
create lease, portal invite) as CI gates — they would have caught every blocker above.**

## Prioritized fix list

| P   | Fix                                                                                                                                                                | Files                                                                      | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---- |
| P0  | Stabilize `useMultiStepForm` persistence deps (memoize/key by string); clear poison draft defensively on crash                                                     | `lib/hooks/use-multi-step-form.ts`, `leases-view.tsx`                      | XS   |
| P0  | Align receipt date schema (accept date-only or send full ISO); render the record-payment dialog independent of tab mount                                           | `app/api/receipts/route.ts:26`, `financials-container.tsx:144`             | XS   |
| P0  | Tenant minimal create: omit lease fields when empty instead of `Invalid Date`                                                                                      | tenant service `create` (`lib/services/database/database.ts` tenant block) | XS   |
| P0  | Portal link: `method: "POST"` + read `portalLink`; fix "30 days" copy to 7                                                                                         | `tenant-detail-view.tsx:100-112`, `portal-link/route.ts:91`                | XS   |
| P0  | Fix checklist visibility (remove/guard the entrance animation) + honor `?action=create-property`                                                                   | `onboarding-checklist.tsx`, portfolio view                                 | S    |
| P1  | Locale: make the URL segment authoritative for signed-in pages (`html lang`, messages); sweep the PT/EN patchwork on Financials/Portfolio/People                   | `lib/i18n/config.ts`, layout chain                                         | M    |
| P1  | Surface the AT rent-receipt flow in the UI (receipts tab or Compliance hub); make the per-receipt PDF a bilingual Recibo (NIF, period, landlord data)              | new UI + `receipts-view.tsx:174`                                           | M    |
| P1  | Seed tax rules on first boot (or Settings > Tax Rules "Load official 2020-2026 rules" button + README note)                                                        | `scripts/ensure-sqlite.js` or tax-rules view                               | S    |
| P1  | Fix dead "Add Vendor"; un-strand `/buildings` (nav or fold into Portfolio); delete or link `/insights`, `/contracts` orphans                                       | `contacts-view.tsx`, `lib/portal/access.ts`                                | S    |
| P1  | Add CSRF header to bulk receipts (+ surface API errors as toasts — several failures were fully silent)                                                             | `financials-view.tsx`                                                      | XS   |
| P2  | Coherence pass: unpaid-this-month vs receipts; matrix expected-rent from leases; NaN guard; property status follows tenancy; portal payment status                 | action-panel + matrix + portal data mappers                                | M    |
| P2  | Polish: human receipt numbers (not CUIDs), formatted dates on lease/tenant pages, localized expense categories, "Amount (€)", demo fixture dates relative to today | various                                                                    | S    |
| P2  | Four Playwright journey tests as CI gates (first-run, payment, lease, portal invite)                                                                               | `e2e/`                                                                     | M    |

## Evidence

40+ screenshots and network logs were captured during this run (session scratchpad,
`shots/j1-*` … `j9-*`) and the key ones are embedded in the companion visual report. The
walkthrough required three documented evaluator interventions that a real user cannot
perform: creating the lease and the receipt via direct API calls (to evaluate downstream
surfaces after blockers 1–2) and clearing the poison localStorage draft. All other steps
were performed exactly as a human would.

## Relationship to existing docs

Strategy → `PRODUCT_AUDIT_2026.md` · IA/backlog → `UX_AUDIT_2026.md` · mobile →
`MOBILE_UX_AUDIT.md` · density/governance → `ARCHITECTURE_GOVERNANCE_AUDIT_2026.md` ·
**this doc** → what a human actually experiences, verified end-to-end, with the fix list
that closes the gap between the promise and the product.
