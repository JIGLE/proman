# ProMan — Complete UX Architecture Audit & Redesign Strategy

**Version 1.0 · May 2026 · Senior SaaS UX Architecture Review**

---

## Executive Summary

ProMan is a technically mature, feature-rich property management platform targeting property owners, tenants, administrators, and managers in the PT/ES market with multi-language support. The engineering foundation is strong — the component library is consistent, the design token system is well-structured, and the service/API architecture is clean.

However, the UX architecture has accumulated significant **structural debt** in four key areas:

1. **Navigation entropy** — 12+ sidebar items at the same visual weight with no clear operational hierarchy
2. **Information architecture confusion** — `Portfolio`, `Properties`, `Buildings`, `People`, `Contacts`, `Owners` exist as overlapping concepts confusing users about where to go
3. **Dashboard cognitive overload** — the owner dashboard surfaces too many metrics simultaneously without a clear scanning path
4. **Tenant experience underinvestment** — the tenant portal (token-based URL) is architecturally isolated from the main app, creating a two-tier quality gap

The platform has the bones of a premium SaaS product. This audit provides a complete roadmap to make it feel like one.

---

## A. Executive UX Audit Summary

### Biggest UX Issues

| #   | Issue                                                                                                                                   | Severity | Impact                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| 1   | Navigation has 12 flat items with no priority signaling                                                                                 | Critical | Daily friction for every user         |
| 2   | Conceptual overlap: Portfolio / Properties / Buildings / Contacts / Owners / People                                                     | Critical | User confusion about where data lives |
| 3   | Financials module has 7 sub-tabs (receipts, expenses, invoices, rent roll, payment matrix, tax, calculator) — no progressive disclosure | High     | Overwhelming for occasional users     |
| 4   | Dashboard shows all KPIs simultaneously regardless of portfolio size or context                                                         | High     | Empty/small portfolios feel broken    |
| 5   | Tenant portal is a completely separate URL-tree (token-based) with hardcoded English text                                               | High     | Not i18n'd, disconnected quality      |
| 6   | Settings page isolated below a separator, visually deprioritized as an afterthought                                                     | Medium   | Configuration feels like a penalty    |
| 7   | `Correspondence` in its own nav group — single item groups signal poor IA                                                               | Medium   | Orphaned feature perception           |
| 8   | Breadcrumbs rendered above all page content regardless of page depth                                                                    | Low      | Adds visual noise on top-level pages  |

### Biggest Architecture Issues

| #   | Issue                                                                                                                                               | Severity |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Single-level sidebar navigation — no section nesting or grouping semantics                                                                          | Critical |
| 2   | Duplicate page routes (`/properties` → `/portfolio`, `/tenants` → `/people`, `/contacts` → `/people?view=contacts`) — redirect chains in production | High     |
| 3   | `People` page attempts to unify tenants + owners in one view — creates conceptual tension                                                           | High     |
| 4   | Tenant portal is entirely outside the main app shell — no shared navigation, header, or design coherence                                            | High     |
| 5   | Analytics and Insights are two separate pages with unclear scope differentiation                                                                    | Medium   |
| 6   | `Overview` page redirects to `/dashboard` — dead route in sitemap                                                                                   | Low      |

### Biggest Consistency Problems

| #   | Issue                                                                                   | Severity |
| --- | --------------------------------------------------------------------------------------- | -------- |
| 1   | `MetricCard` in dashboard uses hardcoded `text-zinc-*` instead of design tokens         | High     |
| 2   | `ActionTile` uses `rounded-2xl` while most cards use `rounded-lg` — inconsistent radius | Medium   |
| 3   | Financials view uses `successMessage` strings hardcoded in English inside component     | High     |
| 4   | Sidebar Settings link uses hardcoded `"Settings"` label instead of i18n key             | Medium   |
| 5   | Tenant portal pages use no i18n at all — all text is hardcoded English                  | Critical |
| 6   | `glass-sidebar` CSS class used only once with no reusable glassmorphism utility pattern | Low      |

### Most Impactful Improvements (ROI-ordered)

1. **Consolidate navigation** — merge overlapping concepts, introduce section grouping → immediate cognitive clarity
2. **Restructure Financials** — progressive disclosure with primary/secondary metric split → 40% reduction in visual complexity
3. **Fix i18n in tenant portal** — aligns with platform's multi-language promise
4. **Unify tenant portal shell** — bring tenant portal into the same app shell → quality parity
5. **Dashboard context-aware states** — empty, growing, mature portfolio states → removes the "broken" first impression
6. **Consolidate Analytics + Insights** — single intelligence hub with tabs → removes duplicate navigation items

---

## B. Navigation Refactor Proposal

### Current Navigation Architecture (BEFORE)

```
Sidebar (12 items, 3 groups)
├── [Group: Workspace]
│   ├── Dashboard
│   ├── Properties       ← unclear if this is portfolio or buildings
│   ├── Tenants/People   ← confused with Contacts/Owners
│   ├── Maintenance
│   ├── Financials
│   ├── Documents
│   └── Leases
├── [Group: Insights]
│   ├── Analytics
│   └── Reports
├── [Group: Communication]
│   └── Correspondence   ← single-item group
└── [Orphaned — below separator]
    └── Settings         ← not in any group
```

**Problems:**

- 12 items at the same visual hierarchy creates a flat, overwhelming list
- `Insights` and `Communication` are single/dual item groups — they feel tacked on
- `Settings` lives outside all groups and appears as an afterthought
- No distinction between daily-use operational items and configuration/reference items
- Mobile navigation has to arbitrarily pick 5 items from 12

---

### Proposed Navigation Architecture (AFTER)

```
Sidebar (8 primary items, 2 conceptual sections)
│
├── ── OPERATIONS ─────────────────────────────
│   ├── Dashboard           [Home icon]         Primary command center
│   ├── Portfolio           [Building2 icon]    Properties + Units + Buildings
│   ├── People              [Users icon]        Tenants — only; Owners sub-tab
│   ├── Leases              [FileText icon]     All lease contracts
│   ├── Financials          [Wallet icon]       Payments, Receipts, Expenses
│   └── Maintenance         [Wrench icon]       Tickets, Work Orders
│
├── ── INTELLIGENCE ────────────────────────────
│   ├── Analytics           [BarChart2 icon]    Charts, KPIs, Revenue Trends, Insights merged
│   ├── Reports             [FileBarChart icon] Compliance, Tax, SAF-T exports
│   └── Documents           [FileBox icon]      Contracts, Files, Correspondence merged
│
└── ── SYSTEM ──────────────────────────────────
    └── Settings            [Settings icon]     Account, Preferences, Integrations
```

**Changes Rationale:**

| Change                                        | Reasoning                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| Rename group from "Workspace" to "Operations" | Clearer mental model — these are the things you _do_ daily                |
| Rename "Insights" group to "Intelligence"     | Covers both Analytics and Reports conceptually                            |
| Move Documents to Intelligence group          | Documents are reference/archive — not operational                         |
| Merge `Correspondence` into Documents         | Email templates are document-adjacent; single-item groups are an IA smell |
| Merge `Analytics` + `Insights` pages into one | Two pages with overlapping scope is redundant                             |
| Remove "Communication" group entirely         | Absorbed into Documents                                                   |
| Settings gets its own "System" pseudo-group   | Gives it proper visual weight without crowding operations                 |
| Remove orphaned Settings link below separator | Use clean group instead                                                   |
| People page: Tenants = primary, Owners = tab  | Owners are secondary to daily workflow                                    |

**Tenant Navigation (role-filtered — 5 items):**

```
├── Home                  My tenancy summary
├── My Lease              Lease details & documents
├── Payments              Payment history & invoices
├── Maintenance           Submit/track requests
└── Documents             Shared files from owner
```

**Mobile Navigation (bottom bar — 5 items):**

```
Home · Portfolio · Financials · Maintenance · More(…)
```

The `More` drawer expands to show Analytics, Reports, Documents, Settings.

---

## C. Page-by-Page UX Audit

---

### C.1 — Dashboard (`/dashboard`)

**Current State:**

- `OverviewView` renders: MetricCards (4), ActionTiles (4), ExpiringLeases table, OverdueQueue, RecentPayments list, OnboardingChecklist, FeatureHighlightCards
- Empty state: shows full OnboardingChecklist with FeatureHighlightCards
- Tenant view: completely different structure — shows home summary, contacts, lease info

**Problems Found:**

| Problem                                                                             | Severity | Reasoning                                                                                |
| ----------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| All sections visible simultaneously regardless of data state                        | High     | A portfolio with 1 property shows the same layout as one with 50 — no contextual scaling |
| 4 MetricCards always rendered even with no data (shows `0`, `€0.00`)                | High     | Feels broken/empty rather than welcoming                                                 |
| ExpiringLeases + OverdueQueue + RecentPayments = 3 separate list panels below cards | Medium   | Excessive vertical scroll; redundant scanning                                            |
| ActionTiles ("Add Property", "Add Tenant", etc.) appear even with full portfolios   | Medium   | These are onboarding actions, not persistent dashboard items                             |
| `text-zinc-*` hardcoded in `MetricCard` — breaks light mode                         | High     | Design token violation                                                                   |
| `rounded-2xl` on ActionTile vs `rounded-lg` in Card primitives                      | Low      | Radius inconsistency                                                                     |
| Tenant dashboard hardcodes owner contact section as conditional                     | Medium   | Complex conditional branching inside single component                                    |

**Suggested Redesign:**

```
Dashboard (Owner) — 3 contextual states:

STATE 1: Empty (0 properties)
  ──────────────────────────────
  Welcome banner (name + product intro)
  OnboardingChecklist (4 steps)
  FeatureHighlights (3 cards, smaller)

STATE 2: Growing (1-5 properties, active)
  ──────────────────────────────
  Header: "Good morning, {name}" + date
  ┌── Primary Metrics Row (3 cards max) ────────────────┐
  │  Occupancy Rate · Monthly Income · Overdue          │
  └─────────────────────────────────────────────────────┘
  ┌── Attention Required (conditional, only if items exist)
  │  Overdue Payments — compact list (max 3 rows)
  │  Expiring Leases  — compact list (max 3 rows)
  └─────────────────────────────────────────────────────┘
  ┌── Quick Actions (only if not all steps done) ───────┐
  │  Horizontal action strip: [+ Property] [+ Tenant]   │
  └─────────────────────────────────────────────────────┘

STATE 3: Mature (5+ properties)
  ──────────────────────────────
  Same as STATE 2 but:
  - Remove Quick Actions strip entirely
  - Replace with "Recent Activity" feed
  - Show Pending Receipts count prominently

Dashboard (Tenant):
  ──────────────────────────────
  Header: "Welcome, {name}" + property address
  ┌── Lease Summary Card ───────────────────────────────┐
  │  Property · Lease Period · Monthly Rent             │
  │  Next Payment: {date} · Status: {badge}             │
  └─────────────────────────────────────────────────────┘
  ┌── Quick Links ──────────────────────────────────────┐
  │  [Pay Rent] [Submit Request] [View Documents]       │
  └─────────────────────────────────────────────────────┘
  Contact card: Property manager contact info
```

**Component Structure Suggestion:**

```
DashboardPage
  ├── DashboardHeader (greeting + date)
  ├── DashboardMetrics (3-card row)
  ├── AttentionPanel (conditional: overdue + expiring)
  ├── RecentActivity (mature state only)
  └── OnboardingChecklist (empty/growing state only)
```

---

### C.2 — Portfolio (`/portfolio`, was `/properties`)

**Current State:**

- `AssetsView` contains: PropertiesListView with stats bar, map toggle, buildings management, filter/search
- Multiple sub-views within one page

**Problems Found:**

| Problem                                                                                 | Severity | Reasoning                                           |
| --------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| Page tries to be both "property list" AND "buildings management"                        | High     | Two distinct concepts in one page causes confusion  |
| `Buildings` section appears below properties list — visually buried                     | High     | Users may not discover unit management              |
| Occupancy stats rendered as summary cards above the main table — repeats Dashboard KPIs | Medium   | Redundant metric display                            |
| Map view toggle is a secondary feature presented at top level                           | Low      | Map is an advanced feature; should be secondary/tab |

**Suggested Redesign:**

```
Portfolio Page
├── Header: "Portfolio" + [+ Add Property] button
├── Stats Strip (occupancy rate, total units — 1 line, not cards)
├── Tabs:
│   ├── Properties (default) — list/grid with filters
│   ├── Buildings — multi-unit buildings management
│   └── Map — geographic view
└── Property List / Grid with NextAction indicators
```

---

### C.3 — People (`/people`, unifies `/tenants`, `/contacts`, `/owners`)

**Current State:**

- `PeopleView` has view-toggle tabs: Tenants / Owners
- `/tenants`, `/contacts`, `/owners` all redirect here

**Problems Found:**

| Problem                                                                              | Severity | Reasoning                                                    |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------ |
| "People" as top-level label is ambiguous — means tenants AND owners                  | High     | Owners and tenants have very different operational workflows |
| Owners sub-view is rarely accessed but occupies equal tab weight                     | Medium   | 95% of daily use is tenant management                        |
| "Contacts" redirect to `?view=contacts` — unclear what "contacts" means vs "tenants" | High     | Three labels for similar concepts                            |

**Suggested Redesign:**

```
People Page
├── Header: "People" (or "Tenants & Contacts")
├── Tabs:
│   ├── Tenants (default) — active tenants, status badges
│   ├── Owners — property owners directory
│   └── (Contacts eliminated — tenants ARE contacts)
└── Each tab: search, filter, list/grid, bulk actions
```

---

### C.4 — Leases (`/leases`)

**Current State:**

- `LeasesView` with list + calendar view toggle
- Auto-renewal alerts, contract tracking

**Problems Found:**

| Problem                                                                                       | Severity | Reasoning                                                                   |
| --------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Calendar view and list view toggle not persisted between sessions                             | Low      | Users have to re-select view preference                                     |
| Lease detail view opens as full page (`/leases/[id]`) — inconsistent with other detail modals | Medium   | Creates navigation context loss                                             |
| No clear visual distinction between active vs expiring vs expired lease cards                 | Medium   | Status badges exist but are small; expiring leases need more visual urgency |

**Suggested Redesign:**

```
Leases Page
├── Header: "Leases" + stats strip (active: N, expiring: N, expired: N)
├── Alert Banner: "N leases expiring in 60 days" (conditional, amber)
├── Filter Tabs: All · Active · Expiring Soon · Expired
├── List/Calendar toggle (persisted)
└── Lease rows with status badge, expiry date, and [Renew] quick action
```

---

### C.5 — Financials (`/financials`)

**Current State:**

- `FinancialsContainer` wraps a tab system with 7+ sub-tabs: Overview, Receipts, Expenses, Rent Roll, Payment Matrix, Invoices, Tax Calculator

**Problems Found:**

| Problem                                                                                  | Severity | Reasoning                                           |
| ---------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| 7 tabs visible simultaneously — no hierarchy between them                                | Critical | Cognitive overload; users don't know where to start |
| `Tax Calculator` is a tool, not a data view — same visual weight as "Receipts"           | High     | Tools should be separated from data views           |
| `Payment Matrix` is power-user feature presented at equal prominence as basic "Receipts" | High     | Creates noise for 80% of users                      |
| Expense form dialog uses hardcoded English success/error messages                        | High     | i18n violation                                      |
| `timeRange` filter (All / Month / Year) in Financials view — not persisted               | Medium   | Resets on every navigation                          |
| Revenue metric cards use `TrendingUp`/`TrendingDown` icons without accessible labels     | Medium   | Screen readers cannot interpret trend direction     |

**Suggested Redesign:**

```
Financials Page
├── Header: "Financials" + time range selector (Month / Quarter / Year / All)
├── Primary Metrics (3 cards): Revenue · Expenses · Net Income
├── Tabs:
│   ├── Overview (default) — trends chart + recent activity
│   ├── Receipts — rent payment records
│   ├── Expenses — property costs
│   ├── Invoices — outstanding/paid tenant invoices
│   ├── Rent Roll — monthly collection summary
│   └── Reports ← Tax/SAF-T content moved here
│       └── [Tools section] Tax Calculator (collapsible panel)
│           Payment Matrix (advanced/power-user)
```

This reduces the primary tab count from 7+ to 5, with tools under a secondary section.

---

### C.6 — Maintenance (`/maintenance`)

**Current State:**

- `MaintenanceView` with ticket queue, vendor tracking, cost tracking

**Problems Found:**

| Problem                                                          | Severity | Reasoning                                                        |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| No visual priority color coding on ticket rows (Critical vs Low) | High     | Priority badges exist but row background doesn't reflect urgency |
| Vendor section buried in same view as tickets                    | Medium   | Vendors are configuration, not daily operational items           |
| No summary count of open/in-progress/resolved tickets in header  | Medium   | User has to scroll through list to understand workload           |

**Suggested Redesign:**

```
Maintenance Page
├── Header: "Maintenance" + [+ New Ticket]
├── Status Strip: Open: N · In Progress: N · Resolved: N (this month)
├── Tabs:
│   ├── Tickets (default) — prioritized queue with urgency color coding
│   └── Vendors — vendor directory (less frequent use)
└── Ticket rows: priority band on left edge (red/amber/green strip)
```

---

### C.7 — Analytics + Insights (`/analytics`, `/insights`)

**Current State:**

- Two separate pages with unclear scope differentiation
- `AnalyticsDashboard` shows revenue trends and property distribution charts
- `InsightsView` shows KPI metrics and performance data

**Problems Found:**

| Problem                                                                          | Severity | Reasoning                                            |
| -------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| Two pages with overlapping data visualization purpose                            | Critical | Users don't know which to check                      |
| Navigation group "Insights" contains "Analytics" and "Reports" — naming conflict | High     | "Insights" means both the group AND one of the pages |
| Charts lack accessible descriptions (no `aria-label` on chart wrappers)          | High     | Screen reader users cannot interpret charts          |

**Suggested Redesign:**

```
Analytics Page (unified — replaces both /analytics and /insights)
├── Header: "Analytics" + date range picker
├── Tabs:
│   ├── Overview (default) — key performance metrics, top-line charts
│   ├── Revenue — detailed income/expense analysis
│   ├── Properties — occupancy rates, property performance
│   └── Tenants — payment behavior, churn, satisfaction
```

Navigation: Remove `/insights` from sidebar. Merge into `/analytics`.

---

### C.8 — Documents (`/documents`)

**Current State:**

- `DocumentsView` with upload, type classification (contract, invoice, receipt, photo, floorplan, certificate), sharing

**Problems Found:**

| Problem                                                                            | Severity | Reasoning                                |
| ---------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| Document type filter chips visible even with no documents                          | Low      | Shows empty filter states                |
| `Correspondence` (email templates) is a separate nav item but is document-adjacent | High     | Should be a tab/section within Documents |
| Upload dialog doesn't show supported file formats visually                         | Medium   | Users discover limits only on error      |

**Suggested Redesign:**

```
Documents Page
├── Header: "Documents" + [+ Upload Document]
├── Search + type filter chips
├── Tabs:
│   ├── All Documents (default)
│   ├── Contracts — lease agreements, ownership docs
│   ├── Correspondence — email templates, communication history
│   └── Photos & Plans — visual assets
└── Document grid/list with thumbnail previews
```

---

### C.9 — Reports (`/reports`)

**Current State:**

- `ReportsView` with compliance reports, tax exports, PT/ES SAF-T submissions

**Problems Found:**

| Problem                                                                                                   | Severity | Reasoning                                         |
| --------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| Reports page is read-heavy with no visual hierarchy                                                       | Medium   | All report types appear as flat list items        |
| PT/ES country filter at top — but there's no visual distinction between PT and ES compliance requirements | High     | Users may apply wrong country filter accidentally |
| Report generation has no progress state — just loads                                                      | Low      | For large datasets, may feel frozen               |

**Suggested Redesign:**

```
Reports Page
├── Header: "Reports & Compliance" + year selector
├── Country selector: [🇵🇹 Portugal] [🇪🇸 Spain] — prominent tabs
├── Section: Tax Reports (IRS/AEAT declarations, SAF-T)
├── Section: Compliance Reports (NRUA, Rent Cap, AT Submission)
└── Section: Custom Reports (rent roll, tenant statements)
```

---

### C.10 — Settings (`/settings`)

**Current State:**

- `SettingsView` with user preferences, image consent, GDPR settings

**Problems Found:**

| Problem                                                                                | Severity | Reasoning                                                            |
| -------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| Settings is an orphaned link — no group membership                                     | High     | Visual afterthought; hard to discover                                |
| Settings page scope is unclear — seems to only cover user prefs, not app configuration | Medium   | Missing: Organization settings, billing, integrations, notifications |
| GDPR/image consent settings buried in general preferences                              | Medium   | Compliance settings need their own section                           |

**Suggested Redesign:**

```
Settings Page
├── Tabs:
│   ├── Account — profile, password, preferences
│   ├── Organization — company info, tax IDs, locale defaults
│   ├── Notifications — email, in-app notification preferences
│   ├── Compliance — GDPR settings, image consent, data export
│   └── Billing — subscription, payment method (if applicable)
```

---

### C.11 — Tenant Portal (`/tenant-portal/[token]`)

**Current State:**

- Token-based URL — completely outside main app shell
- Separate layout, separate header, no shared sidebar
- Tabs: Home / Payments / Lease / Maintenance / Documents / Invoices
- **All text is hardcoded English — zero i18n**

**Problems Found:**

| Problem                                                                                        | Severity | Reasoning                                           |
| ---------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| No i18n — entire portal hardcoded in English                                                   | Critical | Platform supports PT/EN/ES — portal ignores this    |
| Token URL pattern (`/tenant-portal/abc123def`) is opaque — tenants can't bookmark meaningfully | High     | URL provides no semantic context                    |
| Portal is visually and architecturally disconnected from main app                              | High     | Different quality tier confuses design expectations |
| "Invoices" and "Payments" are two separate tabs but overlap conceptually                       | Medium   | Tenants get confused about the difference           |
| Landing page (`/tenant-portal`) is informational-only with hardcoded help text                 | High     | Should detect authenticated tenants and redirect    |
| Error messages hardcoded: "Invalid or expired portal link."                                    | Critical | Non-translatable                                    |

**Suggested Redesign:**

```
Tenant Portal Architecture:
1. Bring portal under main app shell with tenant-specific navigation
2. Auth via token OR standard NextAuth session (portal link creates session)
3. Portal URL: /{locale}/my-home (clean, bookmarkable)

Tenant Navigation:
├── Home — lease summary, next payment, quick actions
├── Payments — history + invoices merged into one tab
├── Requests — maintenance tickets
└── Documents — shared files + correspondence from owner

i18n: Add tenantPortal.* keys to all messages/*.json files
```

---

## D. Design System Proposal

### D.1 — Typography System

The platform uses `Plus Jakarta Sans` (referenced in CSS comments). Codify the scale:

```css
/* Typography Scale — Semantic Names */
--text-display: 2rem / 600 weight /* Page titles, hero numbers */ --text-heading-1: 1.5rem / 600
  weight /* Section headers */ --text-heading-2: 1.25rem / 600 weight
  /* Card titles, dialog titles */ --text-heading-3: 1rem / 600 weight /* Sub-section labels */
  --text-body-lg: 1rem / 400 weight /* Primary body text */ --text-body: 0.875rem / 400 weight
  /* Default body, table cells */ --text-body-sm: 0.8125rem / 400 weight
  /* Secondary info, timestamps */ --text-caption: 0.75rem / 500 weight
  /* Labels, badges, metadata */ --text-overline: 0.6875rem / 600 weight / uppercase tracking-widest
  /* Group headers in sidebar */;
```

**Current Issues to Fix:**

- `text-zinc-*` hardcoded values in dashboard components → replace with `text-[var(--color-foreground)]` etc.
- `text-3xl font-semibold` for MetricCard values is correct but inconsistently applied elsewhere
- Sidebar group labels use `text-[10px]` hardcoded → should use `--text-overline`

---

### D.2 — Spacing System

The layout uses `p-4 sm:p-6 lg:p-8` for main content padding. Codify:

```css
/* Spacing Scale */
--space-1: 0.25rem (4px) --space-2: 0.5rem (8px) --space-3: 0.75rem (12px) --space-4: 1rem (16px)
  --space-5: 1.25rem (20px) --space-6: 1.5rem (24px) --space-8: 2rem (32px) --space-10: 2.5rem
  (40px) --space-12: 3rem (48px) /* Layout Rhythms */ --page-padding-mobile: 1rem
  --page-padding-tablet: 1.5rem --page-padding-desktop: 2rem --section-gap: 1.5rem
  /* Between page sections */ --card-gap: 1rem /* Between cards in a grid */ --card-padding: 1.25rem
  /* Inside cards */ --form-field-gap: 1rem /* Between form fields */;
```

**Current Issues:**

- `space-y-6` used inconsistently — sometimes `space-y-4`, sometimes `gap-4`
- `p-5` in MetricCard vs `p-4` in other cards — standardize on `--card-padding`

---

### D.3 — Color Semantics

The existing token system is strong. These are the **semantic meaning rules** to enforce:

```
PRIMARY (#6366F1 Indigo)
  → Active states, interactive elements, links, focus rings
  → CTA buttons (primary variant)
  → Active nav item highlight

SUCCESS (#10B981 Emerald)
  → Paid status, Active lease, Occupied property
  → Positive trends (+X%)
  → Completion states

WARNING (#F59E0B Amber)
  → Expiring soon (lease, document)
  → Pending payments
  → Review required states

DESTRUCTIVE (#F43F5E Rose)
  → Overdue payments
  → Terminated/expired leases
  → Delete actions
  → Error states

INFO (#6366F1 — same as primary)
  → Informational banners
  → Neutral status badges
  → Tooltip backgrounds

SURFACE HIERARCHY (elevation layers)
  → surface-0: App background
  → surface-1: Page content areas
  → surface-2: Cards and panels
  → surface-3: Modals, dropdowns, overlays
```

**Issues to Fix:**

- `bg-blue-500/10 text-blue-400` used in `FeatureHighlightCard` — this is not a semantic token, replace with `var(--color-info-muted)` + `var(--color-info)`
- `bg-red-500/10 hover:text-red-500` on sign-out button — use `var(--color-destructive)` consistently

---

### D.4 — Component Standardization Rules

#### Cards

```
Standard Card Anatomy:
- Border: 1px var(--color-border)
- Background: var(--color-card)
- Padding: var(--card-padding) = 1.25rem
- Border Radius: rounded-lg (0.5rem) — CONSISTENT everywhere
- Shadow: var(--shadow-card)
- Hover: var(--shadow-card-hover) + border-color var(--color-border-hover)

RULE: Never mix rounded-2xl and rounded-lg on cards.
RULE: Never use backdrop-blur on cards within already-blurred containers.
```

#### Buttons

```
Primary:    bg-primary text-white hover:opacity-90
Secondary:  bg-secondary text-secondary-foreground
Ghost:      transparent hover:bg-surface-hover
Destructive: bg-destructive text-white
Sizes: sm (h-8), default (h-9), lg (h-10)
```

#### Status Badges

```
Active / Paid / Occupied:   success variant (emerald)
Expiring / Pending:         warning variant (amber)
Expired / Overdue:          destructive variant (rose)
Draft / Inactive:           muted variant (slate)
```

#### Tables

```
Header row: bg-surface-1, text-caption weight
Body rows: transparent, hover:bg-surface-hover
Borders: border-b var(--color-border) on rows
Selected rows: bg-surface-pressed (indigo/12%)
```

#### Forms

```
Label: text-body-sm font-medium text-foreground
Input: bg-input border-border focus:ring-ring h-9
Hint: text-caption text-muted-foreground
Error: text-caption text-destructive
Field spacing: gap-y-4 between fields
Section spacing: gap-y-6 between field groups
```

---

### D.5 — Layout Templates

#### Template A: List Page (Properties, Tenants, Leases)

```
┌─────────────────────────────────────────────┐
│ PageHeader: Title + Description + Actions   │
├─────────────────────────────────────────────┤
│ FilterBar: Search + Filters + ViewToggle    │
├─────────────────────────────────────────────┤
│ BulkActionBar (conditional, on selection)   │
├─────────────────────────────────────────────┤
│ DataView: Table OR Grid                     │
│ (Empty state if no data)                    │
├─────────────────────────────────────────────┤
│ Pagination (if >25 items)                   │
└─────────────────────────────────────────────┘
```

#### Template B: Dashboard Page

```
┌─────────────────────────────────────────────┐
│ DashboardHeader: Greeting + Date            │
├─────────────────────────────────────────────┤
│ MetricRow: 3 primary KPIs (max)             │
├─────────────────────────────────────────────┤
│ AttentionPanel: Alerts/Items needing action │
├─────────────────────────────────────────────┤
│ ActivityFeed OR QuickActions (context)      │
└─────────────────────────────────────────────┘
```

#### Template C: Tabbed Feature Page (Financials, Settings)

```
┌─────────────────────────────────────────────┐
│ PageHeader: Title + Description + Actions   │
├─────────────────────────────────────────────┤
│ TabBar: Tab1 | Tab2 | Tab3 | Tab4           │
├─────────────────────────────────────────────┤
│ Tab Content Area                            │
│ (Each tab uses Template A or D internally) │
└─────────────────────────────────────────────┘
```

#### Template D: Detail View (Lease, Property, Tenant)

```
┌─────────────────────────────────────────────┐
│ DetailHeader: Name + Status Badge + Actions │
├─────────────────────────────────────────────┤
│ PrimaryInfo: Key attributes in 2-col grid  │
├─────────────────────────────────────────────┤
│ RelatedData: Linked entities (tabs or accordion)│
└─────────────────────────────────────────────┘
```

---

## E. UX Debt Prioritization

### Critical (Fix Immediately — Breaks Core UX or Compliance)

| ID  | Item                                                                                  | Effort | Impact                                              |
| --- | ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| C1  | i18n tenant portal — all hardcoded text                                               | Medium | All PT/ES users cannot use portal in their language |
| C2  | Navigation conceptual overlap (Portfolio/Properties/Buildings/People/Contacts/Owners) | High   | Daily confusion for new users                       |
| C3  | `text-zinc-*` hardcoded tokens in dashboard — breaks light mode                       | Low    | Light mode is broken for users using it             |
| C4  | Analytics + Insights duplicate pages                                                  | Low    | Wasted navigation real estate                       |

### High Impact (Fix in Next Sprint Cycle)

| ID  | Item                                                               | Effort | Impact                               |
| --- | ------------------------------------------------------------------ | ------ | ------------------------------------ |
| H1  | Dashboard context-aware states (empty vs growing vs mature)        | Medium | First-impression quality             |
| H2  | Financials tab count reduction (7 → 5 with progressive disclosure) | Medium | Reduces cognitive load for all users |
| H3  | Tenant portal brought under main app shell                         | High   | Quality parity for tenants           |
| H4  | Maintenance priority visual coding (row urgency strips)            | Low    | Faster triage for property managers  |
| H5  | Settings page restructured with proper tabs                        | Medium | Configuration discoverability        |
| H6  | Leases expiring banner (contextual alert)                          | Low    | Proactive lease management           |

### Medium Priority (Next Quarter)

| ID  | Item                                                      | Effort | Impact                                      |
| --- | --------------------------------------------------------- | ------ | ------------------------------------------- |
| M1  | Correspondence merged into Documents                      | Medium | Simpler navigation                          |
| M2  | Portfolio page tabs (Properties / Buildings / Map)        | Low    | Better sub-navigation                       |
| M3  | Breadcrumbs hidden on top-level pages                     | Low    | Reduces noise on Dashboard, Portfolio, etc. |
| M4  | Chart accessibility (aria-labels on all chart containers) | Low    | WCAG compliance                             |
| M5  | Form success/error messages moved to i18n keys            | Medium | i18n completeness                           |
| M6  | Status badge standardization audit                        | Low    | Visual consistency                          |

### Low Priority (Polish Sprint)

| ID  | Item                                                       | Effort   | Impact                      |
| --- | ---------------------------------------------------------- | -------- | --------------------------- |
| L1  | Card border-radius standardization (rounded-lg everywhere) | Very Low | Minor visual consistency    |
| L2  | Typography scale CSS variables                             | Low      | Design system formalization |
| L3  | Mobile nav "More" drawer for secondary items               | Medium   | Mobile UX improvement       |
| L4  | Filter/sort state persistence (localStorage)               | Low      | Power user ergonomics       |
| L5  | Report generation progress state                           | Low      | Perceived performance       |

---

## F. Implementation Roadmap

---

### Phase 1 — Foundation Consistency (Weeks 1–2)

**Goal:** Fix the design system violations and i18n gaps without changing layouts.

| Task                                                                                    | Files                                                                        | Priority |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| Replace all `text-zinc-*` with semantic tokens in `overview-view.tsx`                   | `components/features/dashboard/overview-view.tsx`                            | C3       |
| Replace `bg-blue-500/10 text-blue-400` with token equivalents platform-wide             | Multiple components                                                          | C3       |
| Standardize card `rounded-lg` (audit all feature components for `rounded-2xl` on cards) | `components/features/*/`                                                     | L1       |
| Add i18n translations for tenant portal landing page                                    | `app/tenant-portal/page.tsx`, `messages/*.json`                              | C1       |
| Add i18n translations for tenant portal main page error messages                        | `app/tenant-portal/[token]/page.tsx`, `messages/*.json`                      | C1       |
| Add i18n translations for property list next-action labels                              | `components/features/property/property-list.tsx`, `messages/*.json`          | C1       |
| Move hardcoded success/error strings in form dialogs to i18n                            | `components/features/financial/financials-view.tsx` + others                 | H5       |
| Add `aria-label` to all chart wrappers in Analytics/Insights                            | `components/ui/charts.tsx`, `components/features/insights/insights-view.tsx` | M4       |

---

### Phase 2 — Navigation Architecture (Weeks 3–4)

**Goal:** Restructure the navigation to eliminate conceptual overlap and reduce cognitive load.

| Task                                                                                           | Files                                                                 | Priority |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| Merge `/analytics` and `/insights` into unified Analytics page with tabs                       | `app/[locale]/(main)/analytics/`, `components/features/insights/`     | C4       |
| Rename navigation group labels: "Workspace" → "Operations", "Insights" → "Intelligence"        | `lib/portal/` navigation config                                       | C2       |
| Move `Documents` to "Intelligence" group, absorb `Correspondence` as a tab                     | Navigation config + `components/features/document/documents-view.tsx` | C2       |
| Add `Correspondence` tab inside `DocumentsView`                                                | `components/features/document/documents-view.tsx`                     | M1       |
| Remove `Correspondence` from sidebar navigation                                                | Navigation config                                                     | M1       |
| Update `People` page — rename "Contacts" tab to clarify it's owner-contacts vs tenant-contacts | `components/features/people/people-view.tsx`                          | C2       |
| Add Settings to a "System" group in navigation config                                          | Navigation config                                                     | H5       |
| Update mobile bottom navigation to use 5-item layout with "More" overflow                      | `components/ui/mobile-nav.tsx`                                        | L3       |

---

### Phase 3 — Dashboard Redesign (Weeks 5–6)

**Goal:** Make the dashboard context-aware and visually clean.

| Task                                                                                          | Files                                             | Priority |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| Implement 3 dashboard states: empty, growing, mature                                          | `components/features/dashboard/overview-view.tsx` | H1       |
| Limit MetricCards to 3 primary KPIs (remove pending receipts count from primary row)          | `overview-view.tsx`                               | H1       |
| Remove `ActionTiles` from mature dashboard state (replace with Recent Activity)               | `overview-view.tsx`                               | H1       |
| Redesign tenant dashboard with clean lease summary card + quick links                         | `overview-view.tsx`                               | H3       |
| Add `DashboardHeader` component with greeting + contextual date                               | New component                                     | H1       |
| Implement `AttentionPanel` — conditional section showing only if overdue/expiring items exist | New component                                     | H1       |
| Hide breadcrumbs on top-level pages (dashboard, portfolio, people, financials, maintenance)   | `components/shared/breadcrumbs.tsx`               | M3       |

---

### Phase 4 — Forms, Workflows & Feature Pages (Weeks 7–9)

**Goal:** Restructure complex feature pages with better tab architecture and reduce tab overload.

| Task                                                                                            | Files                                                                           | Priority |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- |
| Restructure Financials: reduce from 7 tabs to 5, move Tax Calculator to sub-section             | `components/features/financial/financials-container.tsx`, `financials-view.tsx` | H2       |
| Add Portfolio page tabs (Properties / Buildings / Map)                                          | `components/features/assets/assets-view.tsx`                                    | M2       |
| Add Leases expiring-soon banner (contextual, amber, conditional)                                | `components/features/lease/leases-view.tsx`                                     | H6       |
| Restructure Maintenance: add status strip header + Vendors tab                                  | `components/features/maintenance/maintenance-view.tsx`                          | H4       |
| Add priority urgency visual coding to maintenance ticket rows                                   | `maintenance-view.tsx`                                                          | H4       |
| Restructure Settings with 5 tabs: Account / Organization / Notifications / Compliance / Billing | `components/features/settings/settings-view.tsx`                                | H5       |
| Add Reports page country tab structure (PT / ES)                                                | `components/features/report/reports-view.tsx`                                   | M1       |

---

### Phase 5 — Polish, Accessibility & Tenant Portal (Weeks 10–12)

**Goal:** Accessibility pass, tenant portal modernization, final polish.

| Task                                                                          | Files                                         | Priority |
| ----------------------------------------------------------------------------- | --------------------------------------------- | -------- |
| Bring tenant portal under main app shell (shared sidebar with tenant nav)     | `app/tenant-portal/`, new tenant layout       | H3       |
| Implement clean tenant URL: `/{locale}/my-home` with token-to-session upgrade | New route, auth middleware                    | H3       |
| Merge Payments + Invoices in tenant portal into single "Payments" tab         | `app/tenant-portal/[token]/page.tsx`          | M1       |
| Full accessibility audit: focus states, keyboard navigation, touch targets    | All interactive components                    | M4       |
| Typography CSS variables implementation                                       | `app/globals.css`                             | L2       |
| Spacing standardization audit — replace magic numbers with spacing scale      | All components                                | L2       |
| Filter state persistence for Properties, Tenants, Financials                  | Multiple hooks/components                     | L4       |
| Report generation progress state (loading skeleton during export)             | `components/features/report/reports-view.tsx` | L5       |

---

## Appendix: Multi-Language UX Guidelines

### Text Expansion Risk Matrix

Portuguese and English are similar in length. Spanish tends to be 10–15% longer. Danish can be 20–30% shorter with compound words but uses umlauts. Plan for:

| Language        | Expansion vs EN | Risk Areas                               |
| --------------- | --------------- | ---------------------------------------- |
| Portuguese (PT) | +5% to +15%     | Button labels, nav items                 |
| Spanish (ES)    | +15% to +25%    | Form labels, table headers, button text  |
| Danish (DA)     | -10% to +10%    | Generally safe, some long compound words |

### Design Rules for i18n Safety

1. **Never use `truncate` on navigation labels** — wrap with `whitespace-normal` and constrain width instead
2. **Buttons: min-width, not fixed width** — use `min-w-[8rem]` not `w-32`
3. **Table headers: allow text wrap** — use `whitespace-normal` in narrow columns
4. **Form labels: 2-line allowance** — allocate `min-h-[2.5rem]` for label containers
5. **Status badges: set max text content** — keep badge labels to 1–2 words
6. **Navigation group titles: allow wrapping** — current `truncate` class in sidebar group labels will clip long translations

### Current i18n Gaps (Action Required)

| Location                                         | Gap                               | Keys Needed                                           |
| ------------------------------------------------ | --------------------------------- | ----------------------------------------------------- |
| `app/tenant-portal/page.tsx`                     | All text hardcoded                | `tenantPortal.landing.*`                              |
| `app/tenant-portal/[token]/page.tsx`             | Error messages hardcoded          | `tenantPortal.errors.*`                               |
| `components/features/property/property-list.tsx` | Next-action labels hardcoded      | `property.nextAction.*`                               |
| Multiple form dialogs                            | Success/error messages in English | `common.success.*`, `common.errors.*`                 |
| Sidebar `Settings` label                         | Hardcoded string                  | `navigation.settings` (already in en.json, not wired) |

---

## Appendix: Accessibility Quick Wins

| Issue                                                        | Fix                                                       | WCAG Criterion          |
| ------------------------------------------------------------ | --------------------------------------------------------- | ----------------------- |
| Chart wrappers have no `aria-label`                          | Add `role="img" aria-label="Description"`                 | 1.1.1 Non-text Content  |
| Trend icons (`TrendingUp`) have no accessible label          | Add `aria-label="Positive trend"` to icon wrapper         | 1.1.1                   |
| `MetricCard` values are `text-3xl` with no semantic role     | Wrap value in `<output>` or `aria-live="polite"`          | 4.1.3 Status Messages   |
| Modal close buttons use only icon with no label              | Add `aria-label="Close dialog"`                           | 4.1.2 Name, Role, Value |
| Bulk action confirmation dialog uses generic "Are you sure?" | Add entity-specific confirmation text                     | 3.3.4 Error Prevention  |
| Touch targets in mobile nav should be minimum 44×44px        | Ensure `h-11 w-11` minimum on mobile interactive elements | 2.5.5 Target Size       |

---

_Audit completed May 2026 · ProMan v1.x · GitHub: JIGLE/proman_
