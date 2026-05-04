# ProMan Roadmap

> Living document. Single source of truth for planned work.
> Last updated: 2026-05-04. UX-audited (end-user simulation): 2026-05-04.

## Current State

**Version**: 1.12.1
**Stage**: Production-ready. Decision-driven UI, multi-scenario demo, map view, and fiscal compliance (PT/ES) in place.

### Completed Features

- **Authentication**: NextAuth v4 with Google OAuth + credentials provider, CSRF protection, session-based auth
- **CRUD Operations**: Full create/read/update/delete for Properties, Units, Tenants, Leases, Receipts, Expenses, Maintenance Tickets, Correspondence, Owners, Contacts, Documents, Invoices, Notifications
- **Portfolio View**: Compact action-driven layout with IssueAlert zone, List/Map tabs, Next Action column, attention row highlights
- **Property Detail Modal**: 4-zone decision-driven interface (Status+Health / Primary Action / Issues Panel / Tabbed info)
- **Property Map**: Status-coded divIcon markers with legend, slide-in side panel, FitBoundsController, dynamic viewport height
- **Demo Mode**: 12 properties with real GPS coords, multi-unit buildings, 3 explicit UX scenarios, realistic financial history
- **Financials**: 4-tab container (Action Queue / Receipts / Occupancy & Rent / Tax Summary) — all 4 fully wired
- **Email Integration**: SendGrid with templates, bulk sending, delivery tracking, exponential-backoff retry
- **Monitoring**: Health endpoints, Prometheus-compatible `/api/metrics`
- **Compliance**: GDPR audit logging, Iberian tax compliance (PT/ES), admin data-access audit trail
- **Internationalization**: next-intl with PT, EN, ES locale support
- **Testing**: Vitest unit/integration suite (93%+ coverage), Playwright E2E suite, CI quality gates (`--max-warnings=0`)
- **Security**: CSP with nonces, input sanitization, rate limiting, timing-safe auth comparisons
- **Infrastructure**: Dockerized for TrueNAS SCALE, standalone Next.js output, SQLite, Helm chart

---

## Phase 0 — Critical Bug Fixes (P0 — do before other phases)

**Goal**: Fix bugs that silently corrupt data, block core user flows, or break the experience for first-time users.

> Found during end-user simulation audit on 2026-05-04.

| #   | Task                                                                                                                                              | Status      | Sprint |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 0.1 | Sign-in page: read `searchParams.get("error")` and display human-readable error message when credentials fail                                     | Not started | Q3-S1  |
| 0.2 | Tenant dashboard + financials container: replace `tenants[0]` hardcode with proper active-tenant lookup from session/portal context               | Not started | Q3-S1  |
| 0.3 | Tenant Detail Modal edit: remove rent/leaseStart/leaseEnd fields entirely — editing them writes to deprecated tenant fields, not the Lease record | Not started | Q3-S1  |
| 0.4 | Tenant Detail Modal view: guard `new Date(derivedLeaseStart)` — renders "Invalid Date" when tenant has no active lease                            | Not started | Q3-S1  |

---

## Phase 1 — Navigation & Orphaned Pages

**Goal**: Make every implemented feature reachable from the UI.

> Audit finding: 5 fully-implemented pages have no nav entry at all
> (`/maintenance`, `/analytics`, `/insights`, `/reports`, `/correspondence`).
> `/leases` has a hidden nav entry but should be a first-class sidebar item.

| #   | Task                                                                                                               | Status      | Sprint |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------- | ------ |
| 1.1 | Add **Maintenance** to `PORTAL_NAV_GROUPS` (Owner role, between People and Payments, `mobilePrimary: true`)        | Not started | Q3-S1  |
| 1.2 | Un-hide **Leases** in `PORTAL_NAV_GROUPS`; remove the duplicated Tenants tab from `TenantsLeasesContainer`         | Not started | Q3-S1  |
| 1.3 | Add **Analytics** and **Reports** to sidebar under a secondary nav group (Owner role, `hidden: false`)             | Not started | Q3-S2  |
| 1.4 | Add **Correspondence** to sidebar under the secondary nav group (Owner role)                                       | Not started | Q3-S2  |
| 1.5 | Fix mobile bottom nav: swap People → Maintenance at slot 3 (Portfolio / Maintenance / Payments / Documents / more) | Not started | Q3-S1  |

---

## Phase 2 — Maintenance as a First-Class Feature

**Goal**: Build a full work-order experience now that Maintenance is in the nav.

| #   | Task                                                                                                                                                                         | Status      | Sprint |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 2.1 | Expand `MaintenanceTicket` model: `category`, `estimatedCost`, `scheduledDate`, `dueDate`, `vendorName` (rename `assignedTo`), `vendorPhone`, `invoiceRef`, `isTenantReport` | Not started | Q3-S1  |
| 2.2 | Ticket Detail Modal — 4-zone pattern (status+health / primary action / issues / tabs: Overview / Costs / Activity)                                                           | Not started | Q3-S1  |
| 2.3 | Maintenance view improvements: category filter strip, cost summary bar, scheduled date + vendorName columns                                                                  | Not started | Q3-S2  |
| 2.4 | Property Detail Modal: add Maintenance tab (3 most-recent open tickets + "View all →" deep link)                                                                             | Not started | Q3-S2  |
| 2.5 | Image support: change `images` from JSON string to `string[]`, add photo upload to ticket form and detail modal                                                              | Not started | Q3-S3  |

---

## Phase 3 — Lease & Tenant Workflow Fixes

**Goal**: Fix the lease and tenant views that are broken or incomplete.

> Audit finding: `LeaseDetailView` (/leases/[id]) exists but its action buttons
> have no onClick handlers, and lease cards don't link to the view.
> No new lease modal is needed — the full-page view just needs to be wired up.

| #   | Task                                                                                                                                          | Status      | Sprint |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 3.1 | Fix `LeaseDetailView`: add onClick to "Renew", "Edit", "Terminate" buttons                                                                    | Not started | Q3-S1  |
| 3.2 | Wire `LeasesView` cards to navigate to `/leases/[id]` on click                                                                                | Not started | Q3-S1  |
| 3.3 | Tenant Detail Modal rewrite — 4-zone pattern, remove deprecated rent/lease date fields from edit form, add `ConfirmationDialog` before delete | Not started | Q3-S2  |
| 3.4 | Fix `PeopleView` stats bar: replace `tenant.leaseEnd` (deprecated) with count from `state.leases`                                             | Not started | Q3-S1  |
| 3.5 | Fix `OwnerDetailModal` form init bug: replace `useState(() => {...})` with `useEffect(() => {...}, [owner])`                                  | Not started | Q3-S1  |

---

## Phase 4 — Data Model Improvements

**Goal**: Tighten entity relationships and normalize legacy fields.

| #   | Task                                                                                                     | Status      | Sprint |
| --- | -------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 4.1 | Add optional `leaseId` to `Receipt` for per-lease payment history; fix `LeaseDetailView` to use it       | Not started | Q3-S3  |
| 4.2 | Add `unitId` to `MaintenanceTicket` and `Lease` for per-unit tracking in multi-unit buildings            | Not started | Q3-S3  |
| 4.3 | Add `propertyId` to `Correspondence` to enable property-centric filtering                                | Not started | Q3-S4  |
| 4.4 | Add `updateExpense` to `AppContext` (currently only create + delete are exposed)                         | Not started | Q3-S3  |
| 4.5 | Add `actualCost` vs `estimatedCost` split to tickets; optionally auto-create `Expense` on ticket resolve | Not started | Q3-S4  |
| 4.6 | Remove deprecated `rent`/`leaseStart`/`leaseEnd` edit fields from Tenant form (derive from active Lease) | Not started | Q3-S2  |
| 4.7 | Unify `ContractDetailDialog` local `Lease` interface with `lib/types.ts` (add `currency`, `unitName`)    | Not started | Q3-S3  |

---

## Phase 5 — UX Bugs & Workflow Friction

**Goal**: Fix high-friction interactions found during end-user simulation that are not data-model issues.

> All items found during end-user audit 2026-05-04.

| #    | Task                                                                                                                                    | Status      | Sprint |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 5.1  | Dashboard: filter "Lease follow-up" queue to leases ending within 60 days (currently shows all active leases)                           | Not started | Q3-S1  |
| 5.2  | Property list: expose key filters (Needs attention, Lease renewal, Maintenance) on mobile — currently `hidden sm:flex`                  | Not started | Q3-S2  |
| 5.3  | Payment matrix: wrap table in horizontal-scroll container for mobile; add sticky tenant-name column                                     | Not started | Q3-S2  |
| 5.4  | Tenant dashboard: derive "Next rent" from active lease payment schedule instead of `addMonths(new Date(), 1)`                           | Not started | Q3-S2  |
| 5.5  | Tenant Detail Modal: add Quick Links section (Payments, Lease, Property) matching property modal pattern                                | Not started | Q3-S2  |
| 5.6  | Tenant dashboard: add real owner contact mechanism to the "Need help?" callout (email link or in-app message)                           | Not started | Q3-S3  |
| 5.7  | Maintenance form: replace hardcoded `$` label with currency context symbol                                                              | Not started | Q3-S1  |
| 5.8  | Receipt create: default status to `"pending"` instead of `"paid"`; rename CTA to "Record expected payment" vs "Record payment received" | Not started | Q3-S2  |
| 5.9  | Demo banner: add a 5-minute countdown warning before auto-expiry; show a "Extend 15 min" option                                         | Not started | Q3-S2  |
| 5.10 | Demo banner: make Owner/Tenant perspective switcher visible on mobile (currently `hidden md:flex`)                                      | Not started | Q3-S1  |
| 5.11 | Settings: gate `/api/health` endpoint behind admin/owner role check — currently exposed to browser on every settings load               | Not started | Q3-S2  |
| 5.12 | Property detail modal: guard the 4-column KPI grid for narrow viewports (collapses to 2-col below `sm`)                                 | Not started | Q3-S2  |
| 5.13 | Tenant delete: add `await` to `deleteTenant()` call and keep modal open until operation confirms                                        | Not started | Q3-S1  |

---

## Phase 6 — Financial & Reporting Polish

**Goal**: Close the rent-to-receipt-to-fiscal loop that is the app's core value proposition.

| #   | Task                                                                                                                                                       | Status      | Sprint |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 6.1 | One-click PDF receipt generation (`Recibo de Renda` / `Recibo de Renta`) with fiscal regime context                                                        | Not started | Q3-S3  |
| 6.2 | Standardize `Expense.category` to constrained enum (`maintenance`, `insurance`, `taxes`, `utilities`, `management_fee`, `mortgage`, `renovation`, `other`) | Not started | Q3-S4  |
| 6.3 | Annual fiscal summary per property: gross rent, deductible expenses, net taxable income (PT/ES)                                                            | Not started | Q3-S4  |

---

## Phase 7 — Building Management

**Goal**: Give multi-unit buildings a proper first-class entity.

> Audit finding: `Building` type exists in `lib/types.ts` but is never loaded
> into AppState. `buildingId`/`buildingName` on Property are denormalized strings
> with no backing entity. No building management UI exists.

| #   | Task                                                                                                       | Status      | Sprint |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 7.1 | Load `Building[]` into `AppState`; add CRUD actions to `app-context.tsx`                                   | Not started | Q4     |
| 7.2 | Building management page or modal: name, address, list of units (properties) with tenant/lease status      | Not started | Q4     |
| 7.3 | Portfolio view: group properties by building with building-level summary (total units, occupancy, revenue) | Not started | Q4     |

---

## Decisions Log

| Date       | Decision                                                                                           | Rationale                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-04 | Phase 0 added for critical data-corruption and silent-failure bugs                                 | End-user simulation found 4 bugs that corrupt data or silently fail; must be fixed before other phases                   |
| 2026-05-04 | Phase 5 added for UX friction items from end-user audit                                            | 13 high-friction issues found in daily workflows that don't require data model changes                                   |
| 2026-05-04 | No new Lease Detail Modal — fix the existing LeaseDetailView instead                               | `LeaseDetailView` at `/leases/[id]` is fully implemented; needs wiring (card links + dead button onClick), not a rewrite |
| 2026-05-04 | Ticket 4.2 (Payment Matrix sub-tab) removed — already implemented as "Action Queue" in /financials | Audit confirmed all 4 financial tabs are live; nothing to surface                                                        |
| 2026-05-04 | Analytics, Insights, Reports added to nav in Phase 1 instead of a "More" collapse                  | All 3 are fully implemented; hiding them behind a collapse adds friction for no reason                                   |
| 2026-05-04 | Property Detail Modal is the canonical pattern for all entity modals                               | 4-zone structure (status / action / issues / tabs) reduces decision overhead                                             |
| 2026-05-04 | Maintenance promoted to first-class nav item in Phase 1                                            | Single highest-ROI nav change: transforms buried work-order log into daily management workflow                           |
| 2026-05-04 | `assignedTo` renamed to `vendorName`; no FK Vendor entity yet                                      | Vendor entity deferred; free-text covers 90% of solo-landlord use cases                                                  |
| 2026-03-28 | Keep MB WAY/Bizum as documented placeholders                                                       | No provider credentials available                                                                                        |
| 2026-03-11 | Warning ratchet enforced in CI (`--max-warnings=0`)                                                | Prevents warning debt regression                                                                                         |
