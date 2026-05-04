# ProMan Sprint Board — 2026 Q3

Status date: 2026-05-04
Owner: Product + Engineering

> Execution board for the UX/feature roadmap agreed on 2026-05-04.
> See `ROADMAP.md` for the full phase breakdown and decisions log.
> Two-week sprints. P0 = blocker, P1 = high, P2 = normal, P3 = nice-to-have.

---

## Sprint 1 (2026-05-05 → 2026-05-16) — Maintenance in Nav + Model

### Ticket 1.1 — Add Maintenance to sidebar and mobile nav

- Priority: P1
- Effort: 2 points
- Owner: Engineering
- Status: Not started
- Problem: `/maintenance` is unreachable from any nav surface. Users can only land there via deep links from the property detail modal.
- Tasks:
  1. Add `maintenance` entry to `PORTAL_NAV_GROUPS` in `lib/portal/access.ts` (Owner role, between People and Payments, `mobilePrimary: true`).
  2. Add `Wrench` icon to the sidebar entry.
  3. Verify mobile bottom nav now shows 5 items for Owner: Dashboard / Portfolio / Maintenance / Payments / Documents.
- Acceptance criteria:
  1. Maintenance link appears in the desktop sidebar for Owner role.
  2. Maintenance is the 3rd item in the mobile bottom nav for Owner (replacing People for mobile).
  3. No layout regression in mobile nav (grid adjusts to 5 columns).

### Ticket 1.2 — Expand MaintenanceTicket data model

- Priority: P1
- Effort: 3 points
- Owner: Engineering
- Status: Not started
- Problem: Tickets lack `category`, scheduled date, estimated vs actual cost split, and structured vendor info. `assignedTo` is a free-text string with no contact details.
- Tasks:
  1. Add to `lib/types.ts` `MaintenanceTicket`: `category`, `estimatedCost`, `scheduledDate`, `dueDate`, `vendorName` (rename `assignedTo`), `vendorPhone`, `invoiceRef`, `isTenantReport`.
  2. Update `lib/schemas/maintenance.schema.ts` with new fields and validation.
  3. Update SQLite migration / `db-init` to add new columns.
  4. Keep `assignedTo` as a read alias during migration to avoid breaking existing records.
- Acceptance criteria:
  1. `npm run type-check` passes with new fields.
  2. Existing maintenance records load without error.
  3. New fields are optional; no breaking change to the create API.

### Ticket 1.3 — Ticket Detail Modal (4-zone pattern)

- Priority: P1
- Effort: 8 points
- Owner: Engineering
- Status: Not started
- Problem: Clicking a ticket opens a basic form dialog. There is no structured view of ticket health, primary action, or related cost/activity.
- Tasks:
  1. Create `components/features/maintenance/ticket-detail-modal.tsx` following the property-detail-modal 4-zone pattern.
  2. Zone 1 — Status + Health: priority badge, status badge, category chip, property link, days since opened.
  3. Zone 2 — Primary Action: context-sensitive CTA ("Schedule" → "Start work" → "Resolve & enter cost").
  4. Zone 3 — Issues panel: overdue (past `dueDate`), no assignee, no estimated cost, no scheduled date.
  5. Zone 4 — Tabs: Overview (title, description, notes) / Costs (estimated vs actual, invoice ref) / Activity (status history log).
  6. Wire into `maintenance-view.tsx` to open on row/card click.
- Acceptance criteria:
  1. Clicking any ticket opens the detail modal, not the inline edit form.
  2. All 4 zones render correctly for the 3 demo ticket scenarios.
  3. Status change from the modal updates the ticket list in real time.
  4. No React Rules of Hooks violation. DialogTitle present for accessibility.

---

## Sprint 2 (2026-05-19 → 2026-05-30) — Maintenance View + Tenant Modal

### Ticket 1.4 — Maintenance view improvements

- Priority: P2
- Effort: 5 points
- Owner: Engineering
- Status: Not started
- Problem: No way to filter by type of work. No cost visibility at a glance. No scheduled date in table view.
- Tasks:
  1. Add category filter chip strip (mirrors the portfolio "Filter" strip pattern).
  2. Add compact cost summary bar at top: "Total estimated: €X · Total actual: €Y" across open tickets.
  3. Add `scheduledDate` and `vendorName` columns to table view.
  4. Show `isTenantReport` badge on tenant-submitted tickets.
- Acceptance criteria:
  1. Category filter correctly narrows ticket list.
  2. Cost summary reflects live totals from filtered set.

### Ticket 1.5 — Maintenance tab in Property Detail Modal

- Priority: P2
- Effort: 3 points
- Owner: Engineering
- Status: Not started
- Problem: Property modal has Overview / Financials / Details tabs but no maintenance visibility. Users must leave the modal to check repair status.
- Tasks:
  1. Add "Maintenance" tab to the tab strip in `property-detail-modal.tsx`.
  2. Show the 3 most recent open tickets for the property with priority badge and status.
  3. "View all →" deep link to `/maintenance?property={id}`.
- Acceptance criteria:
  1. Maintenance tab appears when the property has at least one ticket.
  2. Deep link navigates correctly and filters maintenance view to that property.

### Ticket 2.1 — Tenant Detail Modal rewrite (4-zone pattern)

- Priority: P1
- Effort: 8 points
- Owner: Engineering
- Status: Not started
- Problem: Tenant modal is a flat info display with deprecated fields in the edit form. Delete has no confirmation. No primary action or issue detection.
- Tasks:
  1. Rewrite `components/features/tenant/tenant-detail-modal.tsx` to 4-zone pattern.
  2. Zone 1 — Status: payment status badge, days overdue if applicable, lease expiry warning.
  3. Zone 2 — Primary Action: "Record payment" (overdue) / "Renew lease" (expiring) / "Add lease" (no active lease).
  4. Zone 3 — Issues: no active lease, email absent, overdue > 30 days.
  5. Zone 4 — Tabs: Overview (contact info, notes) / Lease (active lease card) / Payments (last 3 receipts).
  6. Remove `rent`, `leaseStart`, `leaseEnd` from edit form — derive from active lease.
  7. Add `ConfirmationDialog` before delete.
- Acceptance criteria:
  1. All 4 zones render correctly for the demo tenant scenarios.
  2. Delete requires confirmation.
  3. No deprecated fields in the edit form.

### Ticket 3.1 — Remove deprecated Tenant fields from forms

- Priority: P1
- Effort: 2 points
- Owner: Engineering
- Status: Not started
- Problem: `Tenant.rent`, `Tenant.leaseStart`, `Tenant.leaseEnd` are `@deprecated` but still appear in the create/edit form, creating confusion about the source of truth.
- Tasks:
  1. Remove those 3 fields from the tenant create and edit forms.
  2. Derive displayed rent and lease period from the active `Lease` record.
- Acceptance criteria:
  1. Tenant create form has no rent or lease date fields.
  2. Displayed values are sourced from the active Lease.

---

## Sprint 3 (2026-06-02 → 2026-06-13) — Lease Modal + Owner Fix + PDF

### Ticket 2.2 — Lease Detail Modal

- Priority: P1
- Effort: 8 points
- Owner: Engineering
- Status: Not started
- Problem: Leases can be created via a wizard but there is no read-mode detail dialog. Viewing a lease opens the edit wizard, which is disruptive.
- Tasks:
  1. Create `components/features/lease/lease-detail-modal.tsx` (4-zone pattern).
  2. Zone 1 — Status: active/expired/pending badge, days remaining countdown, auto-renew flag.
  3. Zone 2 — Primary Action: "Renew" / "Upload contract" / "Record payment".
  4. Zone 3 — Issues: no contractFile, no taxRegime, no deposit.
  5. Zone 4 — Tabs: Terms / Contract (PDF view/upload) / Payments (linked receipts).
- Acceptance criteria:
  1. Clicking a lease row opens the detail modal in read mode.
  2. Edit still works from within the modal.
  3. Days-remaining countdown is accurate.

### Ticket 2.3 — Owner Detail Modal bug fix + summary

- Priority: P2
- Effort: 3 points
- Owner: Engineering
- Status: Not started
- Problem: Edit form state does not re-initialize when a different owner is passed (uses `useState` initializer instead of `useEffect`). No owned-properties summary in view mode.
- Tasks:
  1. Replace `useState(() => toFormData(owner))` with `useEffect` that resets form when `owner` prop changes.
  2. Add a read-only properties-owned card in view mode (list + ownership %).
- Acceptance criteria:
  1. Opening a second owner after a first shows the correct data in the edit form.
  2. Properties-owned summary is visible in view mode.

### Ticket 2.4 — Unify Contract Detail Dialog with global Lease type

- Priority: P2
- Effort: 2 points
- Owner: Engineering
- Status: Not started
- Problem: `ContractDetailDialog` uses a local `Lease` interface with `currency` and `unitName` fields not present in `lib/types.ts`, creating type divergence.
- Tasks:
  1. Add `currency?: string` and `unitName?: string` to global `Lease` type in `lib/types.ts`.
  2. Update `lease.schema.ts` and API routes accordingly.
  3. Remove the local interface from `contract-detail-dialog.tsx`.
- Acceptance criteria:
  1. No local `Lease` interface in `ContractDetailDialog`.
  2. `npm run type-check` passes.

### Ticket 4.1 — PDF receipt generation

- Priority: P1
- Effort: 5 points
- Owner: Engineering
- Status: Not started
- Problem: Receipts exist as records but there is no one-click PDF export. This is the core value prop shown on the landing page ("Da renda em atraso ao registo fiscal pronto").
- Tasks:
  1. Add `generateReceiptPdf(receipt)` utility that produces a print-formatted layout.
  2. Include: landlord info, tenant info, property, amount, date, fiscal regime, receipt number.
  3. Expose as a "Download PDF" / "Print" button on the receipt detail view and receipt row action menu.
- Acceptance criteria:
  1. Clicking "Download PDF" on any paid receipt produces a correctly formatted document.
  2. PT receipts include "Recibo de Renda" heading and IRS category; ES receipts include "Recibo de Alquiler" and IRPF context.

---

## Sprint 4 (2026-06-16 → 2026-06-27) — Data Model + Financial + Nav Polish

### Ticket 3.3 — Normalize MaintenanceTicket.images to string[]

- Priority: P2
- Effort: 3 points
- Owner: Engineering
- Status: Not started

### Ticket 3.4 — Estimated vs actual cost + auto-create Expense

- Priority: P2
- Effort: 5 points
- Owner: Engineering
- Status: Not started

### Ticket 3.5 — Add leaseId to Receipt

- Priority: P2
- Effort: 3 points
- Owner: Engineering
- Status: Not started

### Ticket 4.2 — Surface Payment Matrix as /financials sub-tab

- Priority: P2
- Effort: 2 points
- Owner: Engineering
- Status: Not started

### Ticket 4.3 — Standardize Expense.category enum

- Priority: P2
- Effort: 2 points
- Owner: Engineering
- Status: Not started

### Ticket 4.4 — Annual fiscal summary per property

- Priority: P2
- Effort: 5 points
- Owner: Engineering
- Status: Not started

### Ticket 5.1 — Desktop sidebar "More" section

- Priority: P3
- Effort: 3 points
- Owner: Engineering
- Status: Not started

### Ticket 5.2 — Empty states with inline CTAs

- Priority: P2
- Effort: 2 points
- Owner: Engineering
- Status: Not started

---

## Risk Register

- Ticket 1.3 (Ticket modal) is the highest-effort item in Sprint 1 — consider spiking the zone layout before full implementation.
- PDF generation (4.1) may require a headless PDF library (e.g. `@react-pdf/renderer`) — evaluate bundle size impact before committing.
- Data model changes (3.x) require SQLite migration scripts that must be forward-compatible with existing production databases.
- Mobile nav change (Ticket 1.1) swaps "People" for "Maintenance" at position 3 — validate with user if People access on mobile is needed (can be reached via sidebar on tablet+).

## Weekly Operating Rhythm

- Monday: Board grooming and status update.
- Wednesday: Mid-sprint risk checkpoint.
- Friday: Demo, CI green check, sprint progress review.
