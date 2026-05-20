# UX Improvement Plan

**Source:** Full UX & IA Audit — May 19, 2026  
**Scope:** All issues raised in the audit, organized by phase, effort, and implementation specifics.

---

## How to Read This Plan

Each item includes:

- **What to change** — exact description of the edit
- **Files** — precise file paths
- **Effort** — S (< 1h), M (half-day), L (full day), XL (multi-day)
- **Audit ref** — the severity level from the audit

Items are grouped into three phases:

- **Phase 1 — Copy & Config:** No structural changes. Rename, reword, reorder. Safe to ship in a single PR.
- **Phase 2 — Component Changes:** UI additions, removals, and reorganization. Requires review.
- **Phase 3 — Strategic Redesign:** Architecture-level changes. Requires design work before coding.

---

## Phase 1 — Copy & Config

> Target: 1–2 days total. All changes are isolated to translation files, nav config, and component-level string literals. No new components, no route changes.

---

### 1.1 Fix English stat labels in Portfolio to match PT/ES equivalents

**Audit ref:** Medium  
**Effort:** S

The Portuguese and Spanish translations already use plain language ("Receita mensal", "Unidades geridas"). English uses jargon ("Run rate", "Tracked units"). Align EN to match the clarity of the other locales.

**File:** `messages/en.json`

| Key                            | Current           | Change to           |
| ------------------------------ | ----------------- | ------------------- |
| `portfolio.stats.trackedUnits` | `"Tracked units"` | `"Properties"`      |
| `portfolio.stats.runRate`      | `"Run rate"`      | `"Monthly revenue"` |

No component changes required — these keys are already consumed via `t("stats.trackedUnits")` in `components/features/assets/assets-view.tsx`.

---

### 1.2 Rename navigation labels: Portfolio → Properties, People → Tenants

**Audit ref:** Critical (Portfolio), High (People)  
**Effort:** S

**File:** `messages/en.json`, section `navigation`

| Key                     | Current       | Change to      |
| ----------------------- | ------------- | -------------- |
| `navigation.properties` | `"Portfolio"` | `"Properties"` |
| `navigation.tenants`    | `"People"`    | `"Tenants"`    |

**Note:** Do NOT change the Portuguese and Spanish equivalents — those translations are already idiomatic. Only EN needs updating.

**Also update** the `label` fallback strings in `lib/portal/access.ts` for the same two items:

```ts
// properties item
label: "Properties",   // was "Portfolio"

// tenants item
label: "Tenants",      // was "People"
```

**Secondary consistency fix:** The `portfolio.badge` key in `messages/en.json` currently reads `"Portfolio workspace"`. Change to `"Properties workspace"`. The `portfolio.tabs.portfolioList` key reads `"Portfolio list"` — change to `"Properties"`.

---

### 1.3 Fix Analytics page heading and subtitle

**Audit ref:** Medium  
**Effort:** S

**File:** `components/features/dashboard/analytics-dashboard.tsx`

Current:

```tsx
<h2 className="text-2xl font-bold tracking-tight text-zinc-50">
  {t("navigation.dashboard")} Analytics
</h2>
<p className="text-sm text-zinc-400 mt-1">
  Comprehensive property management insights and KPIs
</p>
```

The heading renders as "Dashboard Analytics" (redundant — the breadcrumb already says "Analytics Dashboard"). The subtitle uses "KPIs", a corporate term.

Change to:

```tsx
<h2 className="text-2xl font-bold tracking-tight text-zinc-50">
  Portfolio analytics
</h2>
<p className="text-sm text-zinc-400 mt-1">
  Track rent income, occupancy, and lease health across your properties.
</p>
```

Also fix the breadcrumb hardcoded string on the line above:

```tsx
// Current
<span className="text-zinc-200">Analytics Dashboard</span>
// Change to
<span className="text-zinc-200">Analytics</span>
```

---

### 1.4 Fix "Owner highlights" heading on the Dashboard

**Audit ref:** Medium  
**Effort:** S

**File:** `components/features/dashboard/overview-view.tsx` (line 621)

Current:

```tsx
<CardTitle>Owner highlights</CardTitle>
```

Change to:

```tsx
<CardTitle>This week&apos;s activity</CardTitle>
```

If this section shows a different time range, adjust accordingly ("Recent activity", "Latest updates").

---

### 1.5 Rename "Action Queue" tab in Financials

**Audit ref:** High (original audit identified "Queue"; the label has since been updated to "Action Queue", which is an improvement but still jargon-heavy)  
**Effort:** S

**File:** `components/features/financial/financials-container.tsx`

Current:

```tsx
<span>Action Queue</span>
```

Change to:

```tsx
<span>Due &amp; Overdue</span>
```

The type union `"queue" | "receipts" | "rent-roll" | "tax"` is internal and does not need to change.

---

### 1.6 Add inline label for PT/ES tax acronyms in Financials

**Audit ref:** High  
**Effort:** S–M

Tax acronyms (SAF-T, NRUA, Rent Cap Validation) are shown bare in the Tax tab with no explanation. For non-specialist users these are blocking.

**File:** Wherever the Tax tab content headings are rendered (likely `components/features/financial/` — find the component that renders SAF-T / NRUA section headers).

For each acronym heading, add a one-line `<p>` subtitle immediately below the `<h3>` or card title:

| Acronym             | Add subtitle                                         |
| ------------------- | ---------------------------------------------------- |
| SAF-T               | "Portuguese tax authority export (IRS/AT)"           |
| NRUA                | "Non-resident urban property form (Modelo 44)"       |
| Rent Cap Validation | "Verify your rent complies with PT annual cap rules" |

This is the minimum viable change. A tooltip icon (`<InfoIcon>` with a `<Tooltip>` from Radix) would be the polished version but is a Phase 2 item.

---

### 1.7 Fix "Correspondence" section subtitle

**Audit ref:** Low  
**Effort:** S

**File:** `components/features/correspondence/correspondence-view.tsx` (line ~274)

Current:

```tsx
<p className="text-zinc-400">Manage templates and send communications</p>
```

Change to:

```tsx
<p className="text-zinc-400">Write notices, rent reminders, and lease renewals for your tenants.</p>
```

This makes the page's purpose immediately concrete rather than describing its mechanism.

---

### 1.8 Update People page subtitle to name the three tabs

**Audit ref:** High  
**Effort:** S

**File:** `components/features/people/people-view.tsx` (line ~78)

Current:

```tsx
<p className="text-sm text-[var(--color-muted-foreground)] mt-1">
  Manage tenants, co-owners, and maintenance contacts from one workspace
</p>
```

Change to:

```tsx
<p className="text-sm text-[var(--color-muted-foreground)] mt-1">
  Your tenants, property co-owners, and maintenance contacts.
</p>
```

Also rename the three tab labels for precision:

| Current    | Change to              |
| ---------- | ---------------------- |
| `Tenants`  | `Tenants` (no change)  |
| `Owners`   | `Co-owners`            |
| `Contacts` | `Maintenance contacts` |

---

### 1.9 Add tenant landing page entry point

**Audit ref:** High  
**Effort:** M

Tenants who visit the marketing page find an owner-oriented product page with no clear path for them.

**File:** The landing page component (`app/[locale]/page.tsx` or the relevant landing page component file).

Find the hero section or near the top of the page. Add a subtle but visible secondary element — ideally a small banner or inline link beneath the primary CTAs:

```tsx
<p className="text-sm text-muted-foreground mt-3">
  Tenant?{" "}
  <a href="/tenant-portal" className="underline underline-offset-4 hover:text-foreground">
    Access your portal here →
  </a>
</p>
```

The `/tenant-portal` route should redirect to a help page explaining that tenants access their portal via the link sent by their landlord. If no such page exists, create a minimal one (see Phase 2).

---

## Phase 2 — Component & IA Changes

> Target: 1 week. Each item is a self-contained component or IA change. Recommended to tackle as individual PRs.

---

### 2.1 Move Correspondence to its own navigation group

**Audit ref:** Critical  
**Effort:** M

This is the single most impactful structural change in the plan. Correspondence is an action tool (send messages, write notices) grouped under "Insights" (data/analytics). This actively hides it.

**File:** `lib/portal/access.ts`

Current structure:

```ts
{
  group: "Insights",
  items: [analytics, reports, correspondence]
}
```

Change to:

```ts
{
  group: "Insights",
  items: [analytics, reports]
},
{
  group: "Communication",
  items: [correspondence]
}
```

Update the group label translation key if groups are translated. The correspondence item itself does not change — only its group membership.

**Also update** `messages/en.json` to add:

```json
"navigation": {
  "communicationGroup": "Communication"
}
```

And the equivalent in `messages/pt.json` (`"Comunicação"`) and `messages/es.json` (`"Comunicación"`).

---

### 2.2 Remove "Overdue Payments" stat from the People page

**Audit ref:** Medium  
**Effort:** S

Overdue payment data is a financial metric that belongs in Financials. Its presence on the People page creates a dual mental model — users may look in two places for the same information.

**File:** `components/features/people/people-view.tsx` (lines ~98–104)

Remove the entire stat card:

```tsx
// Remove this block entirely
<div className="bg-zinc-900 border border-red-500/20 rounded-lg p-4 bg-red-500/5">
  <div className="text-sm text-muted-foreground mb-1">Overdue Payments</div>
  <div className="text-2xl font-bold text-red-400">
    {tenants.filter((t) => t.paymentStatus === "overdue").length}
  </div>
</div>
```

The remaining three stat cards (Total Tenants, Current Leases, Total Owners) form a clean 3-column grid after removal.

**Note:** "Current Leases" in the People stats is also a stretch — it describes a relationship state rather than a people attribute. Consider replacing it with "Active Tenants" (tenants with an active lease) which is more people-centric. This is optional and lower priority.

---

### 2.3 Add orientation banner to the tenant portal

**Audit ref:** High  
**Effort:** M

When a tenant opens their portal link, the header currently shows "Tenant Portal" with the tenant's name as a subtitle and a property badge. This is minimally clear but has no trust-building context.

**File:** `app/tenant-portal/[token]/page.tsx` (lines ~228–247)

Current header:

```tsx
<h1 className="text-lg font-semibold">Tenant Portal</h1>
<p className="text-sm text-gray-500">{tenant.name}</p>
```

Replace with a more informative header:

```tsx
<div>
  <h1 className="text-lg font-semibold">
    {tenant.property ? tenant.property.name : "Your Rental Home"}
  </h1>
  <p className="text-sm text-gray-500">Tenant portal for {tenant.name}</p>
</div>
```

Additionally, add a trust banner directly below the `<header>` element and above `<main>`:

```tsx
{
  tenant.property?.address && (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-sm text-blue-700 text-center">
      Your secure portal for <span className="font-medium">{tenant.property.address}</span>
    </div>
  );
}
```

This gives tenants immediate confirmation they are in the right place, which is critical for trust on a token-based page.

---

### 2.4 Add a primary payment status statement to the tenant portal Overview tab

**Audit ref:** High  
**Effort:** S

The Overview tab already has an "Upcoming Payment Alert" card (with "Pay Now") that appears when there is an upcoming or overdue invoice. This is good. The gap is when there is no outstanding invoice — the tenant sees a generic stat grid with no primary orientation statement.

**File:** `app/tenant-portal/[token]/page.tsx` (inside the `overview` TabsContent, before the quick stats grid)

Add a conditional "all clear" banner when there is no upcoming payment:

```tsx
{
  !upcomingPayment && (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-green-800">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          You&apos;re up to date
        </CardTitle>
        <CardDescription className="text-green-700">
          No payments due right now. Your next rent will appear here when it&apos;s scheduled.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
```

Place this before the quick stats grid so it is the first thing the tenant reads.

---

### 2.5 Add action CTAs to empty state messages that currently lack them

**Audit ref:** Low  
**Effort:** M

**File:** `components/ui/empty-state-illustrations.tsx`

The component already has an `actionLabel` field and likely an `onAction` callback prop. Verify that the `actionLabel` button is actually rendered in the component output — if it is gated behind an optional `onAction` prop, ensure all call sites pass a handler.

For states where no handler is appropriate, update the `description` to include navigation direction:

| State      | Current description                | Add to end of description                              |
| ---------- | ---------------------------------- | ------------------------------------------------------ |
| `leases`   | "Create lease agreements..."       | "Start by adding a property and a tenant first."       |
| `payments` | "Start recording rent payments..." | "Go to a lease to record the first payment."           |
| `receipts` | "Create payment receipts..."       | "Record a payment to generate receipts automatically." |

---

### 2.6 Replace raw template variable syntax in Correspondence with clickable chips

**Audit ref:** Low  
**Effort:** L

Current behavior: The template editor shows `{{tenant_name}}`, `{{rent_amount}}` etc. as raw strings that users must type manually.

**Files:** `components/features/correspondence/correspondence-view.tsx` and the template content `<Textarea>` or rich-text editor component it uses.

**Implementation:**

1. Add a labeled section above the content field: `<p className="text-sm text-muted-foreground mb-2">Insert placeholders:</p>`
2. Render a row of `<Badge>` chips for each available variable.
3. On chip click, insert the variable string at the current cursor position in the textarea using a ref and `setSelectionRange`.
4. Add a short tooltip on each chip explaining what it inserts (e.g., "Tenant's full name").

Available variables (from audit): `{{tenant_name}}`, `{{property_name}}`, `{{rent_amount}}`, `{{lease_start}}`, `{{lease_end}}`, `{{property_address}}`, `{{due_date}}`.

---

### 2.7 Resolve the Buildings navigation inconsistency

**Audit ref:** High  
**Effort:** M

Buildings is a full feature page (with its own H1, stats, building cards) but is marked `hidden: true` in the sidebar navigation. It is accessible only as a tab inside Portfolio/Assets, which is inconsistent with its scope.

**Decision required (choose one):**

**Option A — Promote to nav (recommended if Buildings is used by >10% of owners):**  
In `lib/portal/access.ts`, change `hidden: false` on the buildings item (or add it as a sub-item under the properties group). Update `messages/en.json` to add `"navigation.buildings": "Buildings"` and equivalents in PT/ES.

**Option B — Demote to a filter (recommended if Buildings is niche):**  
Remove the Buildings tab from the Portfolio page tab bar. Instead, add a "Group by building" toggle or filter within the Portfolio list view. This collapses the feature into the existing Properties page and removes the confusing hybrid state.

---

### 2.8 Standardize "Properties" vs "Portfolio" naming in Analytics tabs

**Audit ref:** Medium  
**Effort:** S

The Analytics page has a "Properties" tab internally. If the nav rename in 1.2 goes to "Properties", this is now consistent. However, if the decision is made to keep "Portfolio" in nav, then the Analytics "Properties" tab should be renamed to "Portfolio" to match.

After 1.2 is shipped, verify that the Analytics tab label matches the nav label, and update whichever is the outlier.

**File:** `components/features/dashboard/analytics-dashboard.tsx` — find the tab trigger for `value="properties"` and update its display label.

---

### 2.9 Create a tenant portal landing/help page at `/tenant-portal`

**Audit ref:** High  
**Effort:** M

Currently, visiting `/tenant-portal` (without a token) likely results in a 404 or redirect. Tenants who search for their portal or follow a broken link have no recovery path.

**File:** Create `app/tenant-portal/page.tsx`

Content should be a simple, reassuring page:

```
Tenant Portal

Your landlord will send you a secure link to access your portal.
Check your email for a message from your property manager.

If you've received a link but it's not working, contact your landlord directly.
```

Keep it unstyled/minimal. The goal is a soft landing, not a feature page.

---

## Phase 3 — Strategic Redesign

> Target: Multi-sprint. Each item requires a design phase (wireframes, copy review) before engineering begins. These are opportunities for significant UX improvement, not incremental fixes.

---

### 3.1 Redesign the navigation around user tasks, not data entities

**Audit ref:** Critical (most impactful single change in the plan)  
**Effort:** XL

**Current structure (entity-oriented):**

```
Dashboard | Portfolio | Tenants | Maintenance | Financials | Documents | Leases
Insights: Analytics | Reports
Communication: Correspondence
```

**Proposed structure (task-oriented):**

```
Overview                     ← Today's priorities, quick stats
My Properties                ← Portfolio list, units, occupancy, map
My Tenants                   ← Tenant directory, lease status, contact info
Collect Rent                 ← Due & Overdue queue, record payment, receipts
Contracts & Documents        ← Leases, compliance docs, attachments
Maintenance                  ← Tickets, priorities, history
──── Reporting ────
Analytics                    ← Charts, trends, occupancy
Reports                      ← Generated summaries, exports
Tax & Compliance             ← SAF-T, NRUA, PT/ES exports
──── Tools ────
Communicate                  ← Templates, send messages, history
Settings
```

**Key changes from current:**

- "Financials" becomes "Collect Rent" — communicates the primary action
- "Documents" and "Leases" merge into "Contracts & Documents" — removes the filing ambiguity
- "Correspondence" moves to a "Tools" group and is renamed "Communicate"
- The "Insights" group becomes "Reporting" and gains "Tax & Compliance" as a third item
- Tax is promoted from a tab inside Financials to its own nav item, reflecting its importance as a differentiator

**Implementation path:**

1. Design sprint: Validate proposed structure with 3–5 actual users (even informal interviews)
2. Update `lib/portal/access.ts` nav config
3. Update all translation files
4. Update breadcrumbs and page headings to match new labels
5. Update any hardcoded navigation references in feature components
6. Update E2E tests that rely on nav labels

---

### 3.2 Redesign the tenant portal as a purpose-built surface

**Audit ref:** High  
**Effort:** XL

The tenant portal currently renders the same visual language as the owner app (same card components, same layout density, same data terminology). A tenant's cognitive load and information needs are fundamentally different from an owner's.

**Design principles for a rebuilt tenant portal:**

- **Primary status first:** Open on a single large statement ("Your rent is current" or "You owe €950 due in 3 days") — not a tab grid
- **Task-oriented tabs:** Rename "Overview" → "My Home", "Payments" → "Pay & History", "Invoices" → "Receipts"
- **Simplified language:** Remove all jargon. No "invoice number", use "reference". No "lease end date", use "your contract ends on".
- **Landlord contact visible everywhere:** Show the landlord's contact email/phone on every tab, not buried in a footer
- **Mobile-first:** Tenants are more likely to open a portal link on a phone than on a desktop. Design mobile viewport first.

**Implementation path:**

1. Wireframe three mobile-first screens (home status, payment history, maintenance)
2. Build as a separate layout (`app/tenant-portal/[token]/layout.tsx`) with its own design tokens — do not share the owner app sidebar/nav
3. Replace the current page component with the new layout
4. Port all existing data fetching logic unchanged

---

### 3.3 Introduce "Today" mode for small portfolio owners (≤ 5 properties)

**Audit ref:** Medium (strategic opportunity)  
**Effort:** XL

The current dashboard surfaces an "Action Queue" with overdue rent, lease follow-up, and receipt reminders. This is the right concept but presented as a secondary section below stats.

For owners managing 1–5 properties, the entire app experience could be simplified to a "Today" view that answers three questions:

1. Who owes me rent right now?
2. What maintenance is open?
3. What lease is expiring soon?

**Implementation path:**

1. Detect owner portfolio size on login (count of active properties)
2. If ≤ 5 properties, default the dashboard to a simplified "Today" layout with the three questions above rendered as action cards, not stat tables
3. Provide an "Advanced view" toggle to access the full dashboard
4. This can be A/B tested against the current default without changing the existing dashboard code

---

### 3.4 Merge Documents and Leases into "Contracts & Documents"

**Audit ref:** Medium (IA overlap)  
**Effort:** L

Currently, a user who wants to find a lease contract must know to look in "Leases." A compliance certificate must be in "Documents." An addendum to a lease — which is it? This filing ambiguity forces users to remember a rule that the UI does not communicate.

**Implementation path:**

1. Create a new unified page at `/contracts` (or rename `/documents` to `/contracts`)
2. Add tabs: "Leases", "Certificates & Compliance", "Attachments"
3. Move the current Leases list into the Leases tab
4. Move the current Documents list into the other tabs based on document category
5. Update nav item to "Contracts & Documents" with `FileText` icon
6. Redirect `/leases` and `/documents` to the new unified route
7. Update breadcrumbs, internal links, and E2E tests

---

## Summary Table

| #   | Item                                                    | Phase | Effort | Audit Severity | Files                                                        |
| --- | ------------------------------------------------------- | ----- | ------ | -------------- | ------------------------------------------------------------ |
| 1.1 | Fix EN stat labels (Tracked units, Run rate)            | 1     | S      | Medium         | `messages/en.json`                                           |
| 1.2 | Rename nav: Portfolio → Properties, People → Tenants    | 1     | S      | Critical/High  | `messages/en.json`, `lib/portal/access.ts`                   |
| 1.3 | Fix Analytics heading and subtitle                      | 1     | S      | Medium         | `components/features/dashboard/analytics-dashboard.tsx`      |
| 1.4 | Fix "Owner highlights" heading                          | 1     | S      | Medium         | `components/features/dashboard/overview-view.tsx`            |
| 1.5 | Rename "Action Queue" tab                               | 1     | S      | High           | `components/features/financial/financials-container.tsx`     |
| 1.6 | Add inline labels for SAF-T / NRUA / Rent Cap           | 1     | S–M    | High           | Financial Tax tab component                                  |
| 1.7 | Fix Correspondence subtitle                             | 1     | S      | Low            | `components/features/correspondence/correspondence-view.tsx` |
| 1.8 | Update People page subtitle and tab labels              | 1     | S      | High           | `components/features/people/people-view.tsx`                 |
| 1.9 | Add tenant landing page entry point on marketing page   | 1     | M      | High           | `app/[locale]/page.tsx`                                      |
| 2.1 | Move Correspondence to "Communication" nav group        | 2     | M      | Critical       | `lib/portal/access.ts`, `messages/*.json`                    |
| 2.2 | Remove Overdue Payments stat from People page           | 2     | S      | Medium         | `components/features/people/people-view.tsx`                 |
| 2.3 | Add trust/orientation banner to tenant portal           | 2     | M      | High           | `app/tenant-portal/[token]/page.tsx`                         |
| 2.4 | Add "all clear" status banner to tenant portal Overview | 2     | S      | High           | `app/tenant-portal/[token]/page.tsx`                         |
| 2.5 | Add action guidance to empty state descriptions         | 2     | M      | Low            | `components/ui/empty-state-illustrations.tsx`                |
| 2.6 | Replace Correspondence variable syntax with chips       | 2     | L      | Low            | `components/features/correspondence/correspondence-view.tsx` |
| 2.7 | Resolve Buildings nav inconsistency (promote or demote) | 2     | M      | High           | `lib/portal/access.ts`                                       |
| 2.8 | Align Analytics tab label with nav rename               | 2     | S      | Medium         | `components/features/dashboard/analytics-dashboard.tsx`      |
| 2.9 | Create tenant portal help page at `/tenant-portal`      | 2     | M      | High           | `app/tenant-portal/page.tsx` (new file)                      |
| 3.1 | Redesign nav around user tasks                          | 3     | XL     | Critical       | `lib/portal/access.ts`, all messages, nav components         |
| 3.2 | Rebuild tenant portal as purpose-built surface          | 3     | XL     | High           | `app/tenant-portal/`                                         |
| 3.3 | Introduce "Today" mode for small portfolio owners       | 3     | XL     | Medium         | `components/features/dashboard/`                             |
| 3.4 | Merge Documents + Leases → Contracts & Documents        | 3     | L      | Medium         | routes, nav config, feature components                       |

---

## Suggested Sprint Allocation

### Sprint 1 (Phase 1 — all items, ~2 days)

- Items 1.1 through 1.9
- Single PR per logical group (copy-only changes can be batched; nav config changes should be one PR)
- No feature flags needed — all are copy/config changes with zero functional risk

### Sprint 2 (Phase 2 — high-severity items first)

- Items 2.1 (Correspondence nav), 2.3 + 2.4 (tenant portal trust), 2.7 (Buildings decision), 2.9 (tenant portal landing)
- Items 2.2, 2.5, 2.8 can be batched as a cleanup PR

### Sprint 3 (Phase 2 — remaining + Phase 3 design kick-off)

- Item 2.6 (Correspondence variable chips)
- Begin design phase for 3.1 (nav redesign) and 3.2 (tenant portal rebuild)

### Sprint 4+ (Phase 3 — execution)

- 3.1 navigation redesign (2–3 sprints)
- 3.2 tenant portal rebuild (2 sprints)
- 3.3 and 3.4 can be parallelized with the above
