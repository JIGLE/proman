# Architecture, Governance & Cognitive-Load Audit — 2026-07

> **Scope.** A per-page/per-tab cognitive-load sweep of the owner app, plus the
> architecture and **governance** (docs-vs-code consistency) layer. This doc does
> **not** re-run the UX/IA critique — that lives in `UX_AUDIT_2026.md`,
> `PRODUCT_AUDIT_2026.md`, `DESIGN_AWARD.md`, and `MOBILE_UX_AUDIT.md`. Its value is
> the **measured density table** and the **drift reconciliation**: where the live code
> has grown past the targets the other docs set, and where the docs themselves have gone
> stale relative to the code. Every claim carries a `file:line` citation.
>
> **Verification stance.** Findings 1–3 and the density table were checked directly
> against source this session (`lib/portal/access.ts`, the `*-view.tsx` tab counts,
> `package.json`, `CLAUDE.md`). No behavioral code was changed to produce this doc.

## Thesis

The information architecture is **decided** (Operations / Intelligence-as-Reports /
System — `ROADMAP.md` Decisions Log, 2026-07-09) and the backend is sound. The remaining
cost is not confusion about _what_ the IA is — it is **breadth creep** (the sidebar has
grown past its own documented target) and **drift between the code and the docs that
describe it**. "Cognitive load" here concentrates in two places: the **14-item owner
sidebar** and a **handful of dense tab strips**. "Governance" here means one thing: keep
the code, the version number, and the Decisions Log telling the same story. Three of them
currently don't.

---

## 1. Navigation breadth — the sidebar grew past its documented target

`lib/portal/access.ts:38-173` is the single source of truth for owner navigation. As of
this audit it defined **14 top-level owner items**; the two folds below shipped in the same
pass, bringing it to **12** (Operations 7→6, System 3→2):

| Group          | Items (after this pass)                                       | Was → Now |
| -------------- | ------------------------------------------------------------- | --------- |
| **Operations** | Dashboard, Properties, Tenants, Maintenance, Accounts, Leases | 7 → **6** |
| **Reports**    | Analytics, Reports, Documents, Messages                       | 4         |
| **System**     | Compliance, Settings                                          | 3 → **2** |

`UX_AUDIT_2026.md:136` set the target at **"8 primary items, 2 conceptual sections"** and
its own status note (`:128-133`) already acknowledges the additions (Vendors added to
Operations; Correspondence kept separate instead of folding into Documents; Compliance and
Tax Filing split into their own System items). So this is **acknowledged, not hidden,
drift** — but the honest read is that "a few small item placements" undersells a **+40%
growth** over the documented target, and **Operations alone (7) now sits at the
`UI_CONSISTENCY_GUIDE.md:29` sidebar cap of ≤7**. The sidebar is the highest-frequency
surface in the app; every extra item taxes every session.

**Applied this pass (cheap, reversible):**

- **Grouped the two Compliance items into one hub.** `/compliance/modelo179` and
  `/compliance/tax-filing` were one job ("stay compliant") split across two System rows.
  Tax Filing is now `hidden` in the sidebar and reached via a segmented sub-nav rendered on
  both compliance pages (`compliance-sub-nav.tsx`), so nothing is orphaned and the route
  stays permitted (`canAccessPortalPath` ignores `hidden`). System 3 → 2.
- **Folded `Vendors` (`/contacts`) out of Operations.** Its content is already reachable
  inline via People → Service Providers (`people-view.tsx` renders `ContactsView`), so the
  dedicated top-level row was redundant — exactly the single-purpose entry the IA rationale
  (`UX_AUDIT_2026.md:162`) argues against. Marked `hidden`; Operations 7 → 6.

Neither change touches routing — `/contacts` and both `/compliance/*` routes keep working
(direct links + `normalizePortalPath`, `access.ts:200-211`). Both are one-line reverts
(`hidden: true` → removed) if a landlord misses the top-level rows.

## 1b. Mobile navigation — the secondary items had no home (fixed this pass)

On a phone the desktop sidebar is `hidden md:flex` (`app/[locale]/(main)/layout.tsx:26`), so
the only persistent chrome is the bottom bar (`components/ui/mobile-nav.tsx`), which renders
the **4 primary items** (Dashboard, Properties, Tenants, Accounts) plus one avatar sheet.
Everything else — **Maintenance, Leases, Analytics, Reports, Documents, Messages,
Compliance, Settings** — had **no home in mobile chrome at all**; it was reachable only by
deep link or the ⌘K palette (which needs a keyboard). That's the larger half of the app
invisible on the device most landlords actually carry.

`getSecondaryMobileNavigation` (`access.ts:193`) already computed exactly this list and
nothing consumed it. Fixed by rendering it as a **"Navigate" grid inside the bottom sheet**,
and relabeling the sheet's tab from "Account" to **"More"** (new `navigation.more` key, all
four catalogs) so the affordance honestly signals "the rest of the app," not just profile.
Each link is wrapped in `SheetClose` so tapping navigates and dismisses. The two folds from
Finding 1 compose correctly here — `hidden` items are excluded from the secondary list too,
so Vendors/Tax Filing don't reappear in the sheet. (Note: the sheet is still gated on a
real session, so demo-mode mobile still shows only the 4 primary links — acceptable, and
unchanged by this pass.)

## 2. Label ≠ key ≠ route — a naming-drift maintenance tax

The same nav config uses **three different names for one concept** on several items
(`access.ts:52-94`):

| `key`        | `label` (fallback) | `href`        | i18n `labelKey`         |
| ------------ | ------------------ | ------------- | ----------------------- |
| `properties` | "Properties"       | `/portfolio`  | `navigation.properties` |
| `people`     | "Tenants"          | `/people`     | `navigation.people`     |
| `vendors`    | "Vendors"          | `/contacts`   | `navigation.vendors`    |
| `financials` | "Accounts"         | `/financials` | `navigation.financials` |

The **user-facing layer is already fine** — the rendered label comes from the i18n
`labelKey`, and `messages/en.json` resolves these to clean, consistent nouns (Properties /
Tenants / Accounts / Vendors). The drift is **internal**: `key` and `href` disagree with
the visible label, so E2E selectors, analytics event names, and deep-link copy each have to
pick one of the three and hope the others don't move. **Recommendation (deferred, not done
this pass):** converge `key`/`href` on the visible noun _only where a rename is free_ —
changing a live `href` breaks deep links, persisted tab state, and the `normalizePortalPath`
redirects, so this is a low-value/real-risk trade best done opportunistically, not as a
sweep. The user-visible labels need no change.

## 3. Governance — three sources of truth disagree

| Defect                       | Evidence                                                                                                                                                                                                                                 | Fix                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Version drift**            | `package.json` = **1.16.2**; `CLAUDE.md:7` and `ROADMAP.md:12` say **1.15.0**; the Decisions Log (`ROADMAP.md:164`) says v1.16.0 shipped and flags the split                                                                             | Treat `package.json` as the only version; align `CLAUDE.md`/`ROADMAP.md` headers |
| **Wrong dev-branch pointer** | `CLAUDE.md:76` → `claude/determined-clarke-swzwsz`; the live working branch is `claude/situs-design-polish-6zpz2f`                                                                                                                       | Point `CLAUDE.md` at the real branch                                             |
| **Stale IA recommendation**  | `PRODUCT_AUDIT_2026.md:194` recommends the **task-oriented** IA and `:200-205` asserts nav items are "largely unshipped" — both **overruled** by the Decisions Log (2026-07-09) which adopted the live Operations/Intelligence/System IA | Add a reconciliation note pointing §6 at the adopted decision                    |
| **Stale docs index**         | `docs/README.md:9` still names `SPRINT_BOARD_2026Q2.md` as "Authoritative" and omits `UX_AUDIT_2026`, `PRODUCT_AUDIT_2026`, `DESIGN_AWARD`, `MOBILE_UX_AUDIT`, `DEVELOPMENT_ROADMAP`                                                     | Refresh the index to list the current strategy docs                              |
| **Record vs code gap**       | Task #25 ("adopt one IA") is marked complete and the Decisions Log calls the nav "a few small deltas," yet the live nav carries 14 items (Finding 1)                                                                                     | Record the real count in the Decisions Log when trimming                         |

**Lightweight rule to stop the recurrence (single source of truth):**

- **Version** lives only in `package.json`. Other docs reference it, never restate a number.
- **Navigation** lives only in `lib/portal/access.ts`. Docs describe the _shape_, and defer
  exact item placement to the file (as `UX_AUDIT_2026.md:132` already does).
- The **`ROADMAP.md` Decisions Log is authoritative for IA**; any doc that recommends a
  different IA must carry a "superseded" banner rather than silently disagreeing.

---

## 4. Per-screen cognitive-load table

Measured against the caps in `UI_CONSISTENCY_GUIDE.md` (detail views **≤6 tabs**, list
views **≤5 filters**, no dashboard table **>10 rows**). Tab counts are `<TabsTrigger`
occurrences in each view this session.

| Screen / view                                    | Tabs        | Verdict vs cap                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Settings** (`settings-view.tsx`)               | ~~7~~ **6** | **Fixed this pass.** The tiny `organization` tab (currency + tax country) merged into `tax` → **"Tax & Region"**, so the config now defines **6** (5 on self-hosted, billing hidden). `TabsList` also made horizontally scrollable so no tab clips on a phone. |
| **Property detail** (`property-detail-view.tsx`) | **6**       | **At the cap.** overview, tenants, leases, maintenance, expenses, finance. `expenses`+`finance` overlap and are the obvious merge if a 7th is ever added.                                                                                                      |
| **Tenant detail** (`tenant-detail-view.tsx`)     | 5           | OK.                                                                                                                                                                                                                                                            |
| **Contracts** (`contracts-view.tsx`)             | 4           | OK.                                                                                                                                                                                                                                                            |
| **Vendors/Contacts** (`contacts-view.tsx`)       | 4           | OK (but see Finding 1 — the whole screen is a fold candidate).                                                                                                                                                                                                 |
| **People** (`people-view.tsx`)                   | 3           | OK. tenants / owners / service-providers.                                                                                                                                                                                                                      |
| **Reports** (`reports-view.tsx`)                 | 3           | OK.                                                                                                                                                                                                                                                            |
| **Financials** (`financials-view.tsx`)           | 0           | No tabs, but **data-dense**: a `timeRange` filter driving ~27 `SelectItem` options and a grouped monthly receipts table. Density lives in the table, not chrome — keep an eye on the >10-row dashboard-table rule if it's ever surfaced on the dashboard.      |
| **Dashboard** (`overview-view.tsx`)              | 0           | ~21 card/grid/stat blocks. This is the triage hub, so density is _earned_ — `MOBILE_UX_AUDIT.md` already owns making the ActionPanel the mobile hero. Not re-opened here.                                                                                      |

**Reading:** with Settings fixed, no screen now breaches a hard cap; **Property detail**
(6) is the only one at it. Nothing
else is tab-overloaded. The app's cognitive load is a **navigation-breadth** problem
(Finding 1) far more than a per-screen-tab problem — which is why the nav trim is the
higher-leverage fix.

---

## 5. Architecture (brief — defers to existing docs)

These raise maintenance/cognitive cost but are larger changes; `PRODUCT_AUDIT_2026.md §4`
and `UX_AUDIT_2026.md` own the detail. Listed only so the map is complete:

- **Load-everything `AppContext`** (`lib/contexts/use-app-data.ts`) fetches all entities
  up front — fine for a solo landlord's portfolio, a ceiling for larger ones.
- **Duplicated entity-detail UIs** — property modal + `property-detail-view.tsx`, tenant
  modal + `tenant-detail-view.tsx` — two code paths per entity to keep in sync.
- **Redirect stubs** `/properties`, `/tenants`, `/vendors` resolve via
  `normalizePortalPath` (`access.ts:200-211`) — harmless, but they are the fossil record of
  the naming drift in Finding 2.
- **Single-account identity** — a deliberate, logged decision (`ROADMAP.md:162`), not a
  defect; noted so this audit doesn't appear to have missed it.

---

## 6. Prioritized quick-wins

| P     | Change                                                                                         | Files                                                                     | Effort |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| P0    | Version → 1.16.2; fix dev-branch pointer                                                       | `CLAUDE.md`, `ROADMAP.md` header                                          | XS     |
| P0    | Reconcile the stale IA recommendation                                                          | `PRODUCT_AUDIT_2026.md §6`                                                | XS     |
| P0    | Refresh the docs index                                                                         | `docs/README.md`                                                          | XS     |
| P0    | Log this audit + the nav trim                                                                  | `ROADMAP.md` Decisions Log                                                | XS     |
| ✅ P1 | **Done** — Group the two Compliance items into one hub (System 3→2)                            | `lib/portal/access.ts`, `compliance-sub-nav.tsx`, `compliance/*/page.tsx` | S      |
| ✅ P1 | **Done** — Fold Vendors out of Operations (owner 14→12)                                        | `lib/portal/access.ts`                                                    | S      |
| ✅ P1 | **Done** — Mobile: surface secondary nav in the "More" sheet (§1b)                             | `components/ui/mobile-nav.tsx`, `messages/*.json`                         | S      |
| ✅ P1 | **Done** — Merge Settings `organization`→`tax` "Tax & Region" (7→6 tabs); scrollable tab strip | `components/features/settings/settings-view.tsx`                          | S      |
| P1    | Converge internal key/href with the visible label (user labels already OK)                     | `lib/portal/access.ts`                                                    | S      |
| P2    | Deduplicate property/tenant modal-vs-view code paths                                           | property/tenant detail modal + view                                       | L      |

---

## Relationship to existing docs

This sits **above** the visual/UX docs, not beside them:

- **Density/first-screenful** on mobile → `MOBILE_UX_AUDIT.md`.
- **Visual token craft** → `DESIGN_AWARD.md`.
- **IA decision & backlog status** → `UX_AUDIT_2026.md` + `ROADMAP.md` Decisions Log.
- **Product strategy / habit loop** → `PRODUCT_AUDIT_2026.md`.
- **This doc** → measured per-screen density + the code-vs-docs drift reconciliation.
