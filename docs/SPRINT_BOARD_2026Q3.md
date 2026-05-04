# ProMan Sprint Board — 2026 Q3

Status date: 2026-05-04 (revised after full audit)
Owner: Product + Engineering

> Execution board for the 6-phase roadmap in `ROADMAP.md`.
> Two-week sprints. P0 = blocker, P1 = high, P2 = normal, P3 = nice-to-have.

---

## Sprint 1 (2026-05-05 → 2026-05-16)

### Focus: CRITICAL bug fixes (Phase 0) + nav fixes + quick UX wins + Maintenance model + Lease wiring

---

### Ticket 0.1 — Sign-in: show error feedback on failed login

- Priority: P0
- Effort: 1 point
- Status: Done
- Problem: `signIn("credentials")` failures are silent. The form resets with no message. User cannot tell why login failed.
- Files: `app/auth/signin/page.tsx`
- Tasks:
  1. Read `searchParams.get("error")` on page load.
  2. Map NextAuth error codes to human-readable messages (`CredentialsSignin` → "Incorrect email or password.").
  3. Display error in a visible alert above the form.
- Acceptance criteria:
  1. Wrong credentials shows "Incorrect email or password."
  2. No silent empty state after a failed login.

---

### Ticket 0.2 — Fix `tenants[0]` hardcode in tenant dashboard and financials

- Priority: P0
- Effort: 2 points
- Status: Done
- Problem: Both `overview-view.tsx` and `financials-container.tsx` use `state.tenants[0]`. If the array is unordered the wrong tenant's data displays.
- Files: `components/features/dashboard/overview-view.tsx`, `components/features/financial/financials-container.tsx`
- Tasks:
  1. Identify the correct tenant lookup — match against the session user's email from `useSession()` or portal context.
  2. Replace `tenants[0]` with a deterministic lookup in both files.
- Acceptance criteria:
  1. Tenant dashboard always shows data for the authenticated tenant.

---

### Ticket 0.3 — Remove corrupt edit fields from Tenant modal

- Priority: P0
- Effort: 1 point
- Status: Done
- Problem: Editing Monthly Rent / Lease Start / Lease End writes to deprecated `Tenant` fields, not the `Lease` record. User believes they updated the lease but they haven't.
- Files: `components/features/tenant/tenant-detail-modal.tsx`
- Tasks:
  1. Remove Monthly Rent, Lease Start, Lease End, and Payment Status from the edit form.
  2. Show a read-only "Active lease" card in view mode with values derived from `state.leases`.
  3. Full 4-zone rewrite deferred to Ticket 3.3 in Sprint 2.
- Acceptance criteria:
  1. Edit form has no deprecated lease fields.
  2. Lease dates are shown read-only.

---

### Ticket 0.4 — Guard "Invalid Date" in Tenant modal

- Priority: P0
- Effort: 0.5 points
- Status: Done
- Problem: `new Date(derivedLeaseStart).toLocaleDateString()` renders "Invalid Date" when tenant has no active lease.
- Files: `components/features/tenant/tenant-detail-modal.tsx`
- Tasks:
  1. Guard: `derivedLeaseStart ? formatDate(derivedLeaseStart) : "No active lease"`. Apply to both start and end.
- Acceptance criteria:
  1. Tenants without a lease show "No active lease" rather than "Invalid Date".

---

### Ticket 5.1 — Dashboard: filter Lease follow-up to ≤60 days

- Priority: P1
- Effort: 1 point
- Status: Done
- Problem: "Lease follow-up" shows all active leases. A lease ending in 3 years appears in the queue.
- Files: `components/features/dashboard/overview-view.tsx`
- Tasks:
  1. Filter to leases where `daysUntilEnd <= 60`.
  2. Rename section "Expiring within 60 days".
  3. Add empty state: "No leases expiring soon."
- Acceptance criteria:
  1. Only leases ending within 60 days appear.
  2. Friendly empty state when none.

---

### Ticket 5.7 — Maintenance form: currency symbol from context

- Priority: P1
- Effort: 0.5 points
- Status: Done
- Problem: Cost label hardcodes `$`. EUR users (the target market) see the wrong symbol.
- Files: `components/features/maintenance/maintenance-view.tsx`
- Tasks:
  1. Import currency context hook. Replace `($)` with `({currencySymbol})`.

---

### Ticket 5.10 — Demo banner: perspective switcher on mobile

- Priority: P1
- Effort: 1 point
- Status: Done
- Problem: Owner/Tenant toggle is `hidden md:flex`. Mobile prospects cannot switch to tenant view.
- Files: `components/shared/demo-banner.tsx`
- Tasks:
  1. Render compact Owner | Tenant toggle below the main banner row on mobile.
- Acceptance criteria:
  1. Toggle visible at 375px viewport. Desktop layout unchanged.

---

### Ticket 5.13 — Tenant delete: await + keep modal open on error

- Priority: P1
- Effort: 0.5 points
- Status: Done
- Problem: `deleteTenant()` called without `await` — if it fails, modal closes and tenant appears deleted.
- Files: `components/features/tenant/tenant-detail-modal.tsx`
- Tasks:
  1. Make `handleDelete` async, add `await`, wrap in try/catch.
  2. Only call `onClose()` on success; show error toast on failure.

---

### Ticket 1.1 — Add Maintenance to sidebar + mobile nav

- Priority: P1
- Effort: 2 points
- Status: Done
- Problem: `/maintenance` is unreachable from any nav surface.
- Files: `lib/portal/access.ts`
- Tasks:
  1. Add `maintenance` key to `PORTAL_NAV_GROUPS` (Owner role, between `tenants` and `financials`, `mobilePrimary: true`).
  2. Set `icon: Wrench` (lucide).
  3. Mobile bottom nav: Owner slot 3 becomes Maintenance (displacing People, which moves to sidebar-only on mobile).
- Acceptance criteria:
  1. Maintenance link visible in desktop sidebar for Owner.
  2. Maintenance is 3rd item in mobile bottom nav for Owner (Dashboard / Portfolio / Maintenance / Payments / Documents).

---

### Ticket 1.2 — Un-hide Leases in nav; remove duplicate Tenants tab

- Priority: P1
- Effort: 2 points
- Status: Done
- Problem: `/leases` has `hidden: true` making it unreachable. `TenantsLeasesContainer` duplicates the Tenants view from `/people`.
- Files: `lib/portal/access.ts`, `components/features/lease/tenants-leases-container.tsx`
- Tasks:
  1. Remove `hidden: true` from the `leases` nav entry in `PORTAL_NAV_GROUPS`.
  2. Remove the Tenants tab from `TenantsLeasesContainer` — `/leases` should show only Leases.
- Acceptance criteria:
  1. Leases appears in the sidebar for Owner role.
  2. `/leases` only shows the lease list, no tenant duplication.

---

### Ticket 3.1 — Fix LeaseDetailView dead buttons

- Priority: P1
- Effort: 3 points
- Status: Done
- Problem: "Renew", "Edit", and "Terminate" buttons on `/leases/[id]` have no onClick handlers — dead UI.
- Files: `components/features/lease/lease-detail-view.tsx`
- Tasks:
  1. Wire "Edit" button to open the lease edit wizard with the current lease pre-filled.
  2. Wire "Terminate" button to trigger `ConfirmationDialog` then call `updateLease({ status: "terminated" })`.
  3. Wire "Renew" button to open the lease wizard pre-filled with new start date = day after current end date.
- Acceptance criteria:
  1. All 3 buttons produce a visible action.
  2. Terminate requires confirmation before firing.

---

### Ticket 3.2 — Wire LeasesView cards to LeaseDetailView

- Priority: P1
- Effort: 2 points
- Status: Done
- Problem: Clicking a lease card does nothing. `/leases/[id]` is unreachable within the product.
- Files: `components/features/lease/leases-view.tsx`
- Tasks:
  1. Add `onClick` to each lease card that navigates to `/leases/{lease.id}`.
  2. Visually distinguish clickable cards (cursor-pointer, hover state).
- Acceptance criteria:
  1. Clicking a lease card navigates to its detail page.
  2. Back navigation returns to `/leases`.

---

### Ticket 3.4 — Fix PeopleView stats bar deprecated field

- Priority: P1
- Effort: 1 point
- Status: Done
- Problem: "Current Leases" count reads `tenant.leaseEnd` (deprecated) instead of `state.leases`.
- Files: `components/features/people/people-view.tsx`
- Tasks:
  1. Replace the `leaseEnd`-based count with `state.leases.filter(l => l.status === "active").length`.
- Acceptance criteria:
  1. "Current Leases" count matches the actual count of active leases.

---

### Ticket 3.5 — Fix OwnerDetailModal form init bug

- Priority: P1
- Effort: 1 point
- Status: Done
- Problem: `useState(() => {...})` initializer runs once on mount; form shows stale data when switching between owners.
- Files: `components/features/owner/owner-detail-modal.tsx`
- Tasks:
  1. Replace the inline `useState` initializer (line ~52) with a `useEffect(() => { setFormData(toFormData(owner)); }, [owner?.id])`.
- Acceptance criteria:
  1. Opening the modal for Owner B after Owner A shows Owner B's data in the edit form.

---

### Ticket 2.1 — Expand MaintenanceTicket data model

- Priority: P1
- Effort: 3 points
- Status: Done
- Problem: Tickets lack category, scheduling, estimated/actual cost split, and structured vendor info.
- Files: `lib/types.ts`, `lib/schemas/maintenance.schema.ts`, db-init migration
- Tasks:
  1. Add to `MaintenanceTicket` type: `category` (enum), `estimatedCost` (number?), `scheduledDate` (string?), `dueDate` (string?), `vendorName` (string? — rename `assignedTo`), `vendorPhone` (string?), `invoiceRef` (string?), `isTenantReport` (boolean).
  2. Update schema with new optional fields.
  3. Add new columns to SQLite migration/db-init. Keep `assignedTo` column as read alias for backward compat.
- Acceptance criteria:
  1. `npm run type-check` passes.
  2. Existing maintenance records load without error.
  3. New fields are optional; no breaking changes.

---

### Ticket 2.2 — Ticket Detail Modal (4-zone pattern)

- Priority: P1
- Effort: 8 points
- Status: Done
- Problem: Clicking a ticket opens a basic form dialog. No structured view of ticket health, priority, or costs.
- Files: `components/features/maintenance/ticket-detail-modal.tsx` (new), `components/features/maintenance/maintenance-view.tsx`
- Tasks:
  1. Create `ticket-detail-modal.tsx` using the property-detail-modal 4-zone pattern.
  2. Zone 1 — Status+Health: priority badge, status badge, category chip, property name, days open, `isTenantReport` badge.
  3. Zone 2 — Primary Action: "Schedule" (if open, no scheduledDate) → "Mark in progress" → "Resolve & enter cost" (if in_progress).
  4. Zone 3 — Issues: overdue (past dueDate), no vendorName, no estimatedCost, no scheduledDate.
  5. Zone 4 — Tabs: Overview (title, description, notes) / Costs (estimatedCost, actualCost, invoiceRef) / Activity (status history).
  6. Wire into `maintenance-view.tsx`: row/card click opens detail modal, not inline edit form.
- Acceptance criteria:
  1. Clicking any ticket opens the detail modal.
  2. All 4 zones render for demo scenarios.
  3. Status change from the modal updates the list in real time.
  4. All hooks unconditional. `DialogTitle` present.

---

## Sprint 2 (2026-05-19 → 2026-05-30) — COMPLETE (v1.14.0)

### Focus: Orphaned pages in nav, Maintenance view polish, Tenant modal rewrite, mobile & UX polish

---

### Ticket 1.3 — Add Analytics + Reports to sidebar

- Priority: P2
- Effort: 2 points
- Status: Done
- Problem: `/analytics` and `/reports` are fully implemented but unreachable.
- Files: `lib/portal/access.ts`
- Tasks:
  1. Add a second nav group (e.g. "Insights") with Analytics and Reports entries (Owner role, not mobilePrimary).
- Acceptance criteria:
  1. Analytics and Reports accessible from the desktop sidebar.

---

### Ticket 1.4 — Add Correspondence to sidebar

- Priority: P2
- Effort: 1 point
- Status: Done
- Files: `lib/portal/access.ts`
- Tasks:
  1. Add `correspondence` entry to the "Insights" or "Tools" secondary group.

---

### Ticket 2.3 — Maintenance view improvements

- Priority: P2
- Effort: 5 points
- Status: Done
- Tasks:
  1. Add category filter chip strip.
  2. Add compact cost summary bar (total estimated vs actual across filtered open tickets).
  3. Add `scheduledDate` and `vendorName` columns to table view.
  4. Show `isTenantReport` badge on relevant tickets.

---

### Ticket 2.4 — Property Detail Modal: Maintenance tab

- Priority: P2
- Effort: 3 points
- Status: Done
- Tasks:
  1. Add Maintenance tab to `property-detail-modal.tsx` tab strip.
  2. Show the 3 most recent open tickets for the property with priority badge and status.
  3. "View all →" links to `/maintenance?property={id}`.

---

### Ticket 3.3 — Tenant Detail Modal rewrite (4-zone pattern)

- Priority: P1
- Effort: 8 points
- Status: Done
- Problem: Flat view with deprecated fields in edit form. Delete has no confirmation. No primary action or issue detection.
- Files: `components/features/tenant/tenant-detail-modal.tsx`
- Tasks:
  1. Rewrite to 4-zone pattern.
  2. Zone 1 — Status: payment status badge, days overdue, lease expiry warning.
  3. Zone 2 — Primary Action: "Record payment" (overdue) / "Renew lease" (expiring) / "Add lease" (no active lease).
  4. Zone 3 — Issues: no active lease, email absent, overdue > 30 days.
  5. Zone 4 — Tabs: Overview (contact info, notes) / Lease (active lease card with days remaining) / Payments (last 3 receipts).
  6. Remove deprecated `rent`, `leaseStart`, `leaseEnd` from edit form.
  7. Add `ConfirmationDialog` before delete.
- Acceptance criteria:
  1. All 4 zones render for demo scenarios.
  2. Delete requires confirmation.
  3. No deprecated fields in edit form.

### Ticket 4.6 — Remove deprecated Tenant fields from create/edit form

- Priority: P1
- Effort: 2 points
- Status: Done
- Note: May be done as part of 3.3 naturally.

---

### Ticket 5.2 — Property list: mobile filter strip

- Priority: P1
- Effort: 3 points
- Status: Done
- Problem: Filter chips (Needs attention, Lease renewal, Maintenance, Missing map) are `hidden sm:flex` — invisible on mobile.
- Files: `components/features/property/property-list.tsx`
- Tasks:
  1. Render a scrollable horizontal chip row (no label, icons only) below `sm` breakpoint.
  2. Active chip highlighted. Tap to toggle.
- Acceptance criteria:
  1. All 4 filters accessible on 375px viewport.
  2. Desktop layout unchanged.

---

### Ticket 5.3 — Payment matrix: mobile scroll + sticky column

- Priority: P1
- Effort: 2 points
- Status: Done
- Problem: 12-month × N-tenant table has no horizontal scroll. Clips on any phone.
- Files: `components/features/financial/payment-matrix-view.tsx`
- Tasks:
  1. Wrap table in `overflow-x-auto` container.
  2. Make the tenant name column sticky (`position: sticky; left: 0`).
- Acceptance criteria:
  1. Table scrolls horizontally on mobile.
  2. Tenant names remain visible while scrolling.

---

### Ticket 5.4 — Tenant dashboard: derive "Next rent" from lease schedule

- Priority: P1
- Effort: 2 points
- Status: Done
- Problem: "Next rent" card shows `addMonths(new Date(), 1)` — hardcoded to one month from today, not derived from the lease.
- Files: `components/features/dashboard/overview-view.tsx`
- Tasks:
  1. Find the active lease's payment schedule (derived from `startDate` + monthly cadence).
  2. Calculate the next payment date after today.
  3. Fall back to "—" if no active lease.
- Acceptance criteria:
  1. "Next rent" reflects the actual next due date from the lease.

---

### Ticket 5.5 — Tenant Detail Modal: add Quick Links section

- Priority: P2
- Effort: 2 points
- Status: Done
- Problem: Tenant modal has no navigation to payments, lease, or property — unlike the property modal which has a full quick-links panel.
- Files: `components/features/tenant/tenant-detail-modal.tsx`
- Tasks:
  1. Add Quick Links row: Payment history (→ `/financials?tenantId=`), Active lease (→ `/leases/{leaseId}`), Property (opens property modal).

---

### Ticket 5.8 — Receipts: default status to "pending" for new records

- Priority: P1
- Effort: 0.5 points
- Status: Done
- Problem: Receipt create form defaults `status: "paid"`. Recording an expected-but-unpaid rent requires manually changing to "pending".
- Files: `components/features/financial/receipts-view.tsx`
- Tasks:
  1. Change default status to `"pending"`.
  2. Adjust CTA label: "Record payment received" (status = paid) vs "Record expected payment" (status = pending).

---

### Ticket 5.9 — Demo banner: warn before auto-expiry

- Priority: P1
- Effort: 2 points
- Status: Done
- Problem: Demo expires with no warning. A prospect in the middle of exploring gets instantly redirected to the landing page.
- Files: `components/shared/demo-banner.tsx`
- Tasks:
  1. Show a warning toast/dialog at 5 minutes remaining: "Demo expires in 5 minutes. Extend?"
  2. Add an "Extend 15 min" button that resets the timer.
- Acceptance criteria:
  1. Warning appears at 5 minutes.
  2. User can extend without being interrupted.

---

### Ticket 5.11 — Gate /api/health behind admin role

- Priority: P1
- Effort: 1 point
- Status: Done
- Problem: Settings page fetches `/api/health` on every load, exposing DB connection status and latency to any authenticated user.
- Files: `app/api/health/route.ts`, `components/features/settings/settings-view.tsx`
- Tasks:
  1. Add admin/owner role check to `/api/health` endpoint.
  2. In settings, only call the endpoint if the user has owner role; show "Status unavailable" otherwise.

---

### Ticket 5.12 — Property detail modal: responsive KPI grid

- Priority: P1
- Effort: 1 point
- Status: Done
- Problem: KPI grid uses `grid-cols-4` which renders 4 very narrow columns on mobile.
- Files: `components/features/property/property-detail-modal.tsx`
- Tasks:
  1. Change to `grid-cols-2 sm:grid-cols-4`.
- Acceptance criteria:
  1. KPI cells are 2 columns on mobile, 4 on sm+.

---

## Sprint 3 (2026-06-02 → 2026-06-13)

### Focus: Data model, Lease receipt linkage, PDF, Expense fix, image support

---

### Ticket 2.5 — Maintenance image support

- Priority: P2
- Effort: 5 points
- Status: Not started
- Tasks:
  1. Change `MaintenanceTicket.images` from `string` (JSON) to `string[]` in `lib/types.ts`.
  2. Update all serialization/deserialization paths.
  3. Add photo upload UI to ticket form and image gallery to ticket detail modal.

### Ticket 4.1 — Add leaseId to Receipt

- Priority: P1
- Effort: 3 points
- Status: Not started
- Tasks:
  1. Add optional `leaseId` to `Receipt` type and schema.
  2. Update `LeaseDetailView` to filter receipts by `leaseId` instead of `propertyId + tenantId`.
  3. Update receipt create flow to pre-fill `leaseId` when opened from a lease context.

### Ticket 4.2 — Add unitId to MaintenanceTicket and Lease

- Priority: P2
- Effort: 3 points
- Status: Not started

### Ticket 4.4 — Add updateExpense to AppContext

- Priority: P2
- Effort: 2 points
- Status: Not started
- Tasks:
  1. Add `updateExpense` to the context API alongside existing `addExpense`/`deleteExpense`.

### Ticket 4.7 — Unify ContractDetailDialog with global Lease type

- Priority: P2
- Effort: 2 points
- Status: Not started
- Tasks:
  1. Add `currency?: string` and `unitName?: string` to global `Lease` type.
  2. Remove local interface from `contract-detail-dialog.tsx`.

### Ticket 5.1 — PDF receipt generation

- Priority: P1
- Effort: 5 points
- Status: Done
- Tasks:
  1. Add `generateReceiptPdf(receipt)` utility (print-formatted layout).
  2. PT: "Recibo de Renda" with IRS category. ES: "Recibo de Alquiler" with IRPF context.
  3. "Download PDF" button on receipt detail and receipt row action menu.

---

## Sprint 4 (2026-06-16 → 2026-06-27)

### Focus: Financial reporting, Correspondence data model, UX polish

---

### Ticket 4.3 — Add propertyId to Correspondence

- Priority: P2
- Effort: 3 points
- Status: Not started

### Ticket 4.5 — Estimated vs actual cost split + Expense auto-create

- Priority: P2
- Effort: 5 points
- Status: Not started

### Ticket 5.2 — Standardize Expense.category enum

- Priority: P2
- Effort: 2 points
- Status: Not started

### Ticket 5.3 — Annual fiscal summary per property

- Priority: P2
- Effort: 5 points
- Status: Done

### Ticket 6.1+6.2 — Building entity in AppState + management UI

- Priority: P3
- Effort: 8 points
- Status: Not started

---

## Risk Register

- Ticket 2.2 (Ticket modal) is the highest-effort item in Sprint 1 — spike the zone layout before full implementation.
- PDF generation (5.1) may require a headless PDF library (`@react-pdf/renderer`) — evaluate bundle size impact first.
- Data model changes (4.x) need SQLite migration scripts forward-compatible with existing production databases.
- Removing the Tenants tab from `TenantsLeasesContainer` (1.2) may affect Playwright E2E tests that navigate to `/leases` expecting both tabs — check test suite.
- Mobile nav change (1.1) swaps People → Maintenance at slot 3. People is still reachable via sidebar on desktop. Confirm this is acceptable for mobile-first landlords.

## Weekly Operating Rhythm

- Monday: Board grooming and status update.
- Wednesday: Mid-sprint risk checkpoint.
- Friday: Demo, CI green check, sprint progress review.
