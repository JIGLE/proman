# ProMan Roadmap

> Living document. Single source of truth for planned work.
> Last updated: 2026-05-04.

## Current State

**Version**: 1.12.1
**Stage**: Production-ready. Decision-driven UI, multi-scenario demo, map view, and fiscal compliance (PT/ES) in place.

### Completed Features

- **Authentication**: NextAuth v4 with Google OAuth + credentials provider, CSRF protection, session-based auth
- **CRUD Operations**: Full create/read/update/delete for Properties, Units, Tenants, Leases, Receipts, Expenses, Maintenance Tickets, Correspondence, Owners, Contacts, Documents, Invoices, Notifications
- **Portfolio View**: Compact action-driven layout with IssueAlert zone, List/Map tabs, Next Action column, attention row highlights
- **Property Detail Modal**: 4-zone decision-driven interface (Status+Health / Primary Action / Issues Panel / Tabbed info); hooks-safe; accessibility-compliant
- **Property Map**: Status-coded divIcon markers with legend, slide-in side panel (65/35), FitBoundsController, dynamic viewport height
- **Demo Mode**: 12 properties with real GPS coords, multi-unit buildings, 3 explicit UX scenarios (Happy Path / Needs Attention / Broken Setup), taxRegime on leases, 3 months of receipts
- **Email Integration**: SendGrid with templates, bulk sending, delivery tracking via webhooks, exponential-backoff retry
- **Monitoring**: Health endpoints, Prometheus-compatible `/api/metrics`
- **Compliance**: GDPR audit logging, Iberian tax compliance (PT/ES), admin data-access audit trail
- **Internationalization**: next-intl with PT, EN, ES locale support
- **Mobile Nav**: Dynamic grid layout fix; Owner bottom nav: Dashboard / Portfolio / People / Payments / Documents
- **Testing**: Vitest unit/integration suite (93%+ coverage), Playwright E2E suite, CI quality gates (`--max-warnings=0`)
- **Security**: CSP with nonces, input sanitization, rate limiting, timing-safe auth comparisons, security headers
- **Infrastructure**: Dockerized for TrueNAS SCALE, standalone Next.js output, SQLite with automatic initialization, Helm chart

---

## Phase 1 — Maintenance as a First-Class Feature

**Goal**: Surface Maintenance in navigation and build a full work-order experience.

| #   | Task                                                                                                                                                   | Status      | Sprint |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------ |
| 1.1 | Add Maintenance to sidebar nav + mobile bottom nav (Owner role, `mobilePrimary: true`)                                                                 | Not started | Q3-S1  |
| 1.2 | Expand `MaintenanceTicket` model: `category`, `estimatedCost`, `scheduledDate`, `dueDate`, `vendorName`, `vendorPhone`, `invoiceRef`, `isTenantReport` | Not started | Q3-S1  |
| 1.3 | Ticket Detail Modal — 4-zone pattern (status+health / primary action / issues / tabs)                                                                  | Not started | Q3-S1  |
| 1.4 | Maintenance view: category filter strip, cost summary bar, scheduled date column                                                                       | Not started | Q3-S2  |
| 1.5 | Add Maintenance tab to Property Detail Modal (3 most recent open tickets + "View all")                                                                 | Not started | Q3-S2  |

---

## Phase 2 — Modal Standardization

**Goal**: Bring all entity modals up to the 4-zone property modal standard.

| #   | Task                                                                                                                          | Status      | Sprint |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 2.1 | Tenant Detail Modal rewrite — 4-zone pattern, remove deprecated fields from edit form, add `ConfirmationDialog` before delete | Not started | Q3-S2  |
| 2.2 | Lease Detail Modal (new) — 4-zone pattern; replace wizard-only with a proper view modal                                       | Not started | Q3-S3  |
| 2.3 | Owner Detail Modal — fix form initialization bug (`useState` → `useEffect`), add properties-owned summary                     | Not started | Q3-S3  |
| 2.4 | Contract Detail Dialog — unify local `Lease` interface with global `lib/types.ts` (add `currency`, `unitName`)                | Not started | Q3-S3  |

---

## Phase 3 — Data Model Improvements

**Goal**: Tighten entity relationships and normalize legacy fields.

| #   | Task                                                                                              | Status      | Sprint |
| --- | ------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 3.1 | Remove deprecated `rent`/`leaseStart`/`leaseEnd` from Tenant edit form (derive from active Lease) | Not started | Q3-S2  |
| 3.2 | Add `unitId` to `MaintenanceTicket` and `Lease` for per-unit tracking in multi-unit buildings     | Not started | Q3-S3  |
| 3.3 | Normalize `MaintenanceTicket.images` from JSON string to `string[]` across all read/write paths   | Not started | Q3-S3  |
| 3.4 | Add `actualCost` vs `estimatedCost` split to tickets; auto-create `Expense` on ticket resolve     | Not started | Q3-S4  |
| 3.5 | Add optional `leaseId` to `Receipt` for per-lease payment history and period-accurate reporting   | Not started | Q3-S4  |

---

## Phase 4 — Financial & Reporting Polish

**Goal**: Close the rent-to-receipt-to-fiscal loop that is the app's core value proposition.

| #   | Task                                                                                                                                                       | Status      | Sprint |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| 4.1 | One-click PDF receipt generation (`Recibo de Renda` / `Recibo de Renta`) with fiscal regime context                                                        | Not started | Q3-S3  |
| 4.2 | Surface Payment Matrix view as a sub-tab in `/financials` (alongside Receipts / Invoices / Rent Roll)                                                      | Not started | Q3-S3  |
| 4.3 | Standardize `Expense.category` to constrained enum (`maintenance`, `insurance`, `taxes`, `utilities`, `management_fee`, `mortgage`, `renovation`, `other`) | Not started | Q3-S4  |
| 4.4 | Annual fiscal summary per property: gross rent, deductible expenses, net taxable income (PT/ES) — in property Financials tab + `/reports` export           | Not started | Q3-S4  |

---

## Phase 5 — Navigation & UX Polish

**Goal**: Make every section reachable and give every empty state an action.

| #   | Task                                                                                             | Status      | Sprint |
| --- | ------------------------------------------------------------------------------------------------ | ----------- | ------ |
| 5.1 | Desktop sidebar: add collapsible "More" section for Analytics, Reports, Correspondence, Contacts | Not started | Q3-S4  |
| 5.2 | Empty states with inline CTAs for Maintenance, Documents, Analytics views                        | Not started | Q3-S4  |
| 5.3 | Keyboard nav & accessibility: `aria-describedby` on all modals, map marker keyboard focus        | Not started | Q3-S4  |
| 5.4 | Tablet layout optimisation (breakpoint between mobile bottom nav and full sidebar)               | Not started | Q4     |

---

## Decisions Log

| Date       | Decision                                                             | Rationale                                                                                             |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-05-04 | Property Detail Modal is the canonical pattern for all entity modals | 4-zone structure (status / action / issues / tabs) proven to reduce decision overhead in user testing |
| 2026-05-04 | Maintenance promoted to first-class nav item in Phase 1              | Single highest-ROI change: transforms buried work-order log into daily management workflow            |
| 2026-05-04 | `assignedTo` renamed to `vendorName`; no FK to Vendor entity yet     | Vendor entity deferred to Phase 3/4; free-text covers 90% of solo-landlord use cases                  |
| 2026-03-28 | Keep MB WAY/Bizum as documented placeholders                         | No provider credentials available; documented clearly in public docs                                  |
| 2026-03-11 | Warning ratchet enforced in CI (`--max-warnings=0`)                  | Prevents warning debt regression                                                                      |
