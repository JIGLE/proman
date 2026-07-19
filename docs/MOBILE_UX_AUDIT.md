# Lares — Mobile UX & Behavioural Audit (2026-07)

> **Scope.** A mobile-first, psychology-led audit of the owner-facing app, grounded
> in the _actual_ running app captured at **390 px** with realistic demo data
> (Lisbon / Porto / Barcelona, 12 properties). It complements — does not repeat —
> the existing docs:
>
> - `docs/UX_AUDIT_2026.md` — desktop IA & flow audit
> - `docs/DESIGN_AWARD.md` — visual/token craft
> - `docs/PRODUCT_AUDIT_2026.md` — product strategy & the habit-loop thesis
>
> Where those cover a point, this doc references rather than restates. Its unique
> job is **mobile ergonomics + the behavioural (Hook-loop) layer**, with each
> finding tied to a file so it's directly actionable.

## 0. TL;DR

The app is information-dense and desktop-shaped. On a phone that shows up as
**wasted vertical space, front-loaded cognitive load, and leaked English strings**.
The single strongest asset — the dashboard's deadline-driven triage panel — is
buried under chrome on the first screen. None of this is deep; it's mostly layout
discipline and finishing i18n. Fixing the "first screenful" on every view is the
highest-leverage change.

**North-star for this pass:** on any screen, the thing the user came to do is the
first thing they see and can reach with a thumb.

---

## 1. Method

- Entered demo mode (realistic multi-city portfolio) and captured Dashboard,
  Portfolio, People, Financials, Maintenance at 390 px, dark theme.
- Graded each against: (a) mobile ergonomics, (b) cognitive load / hierarchy,
  (c) the Hook loop (Trigger → Action → Variable reward → Investment), (d) trust
  (consistency, i18n, polish).

---

## 2. Findings (severity-ordered, each mapped to a file)

### P0 — cheap, high-impact

| #   | Finding (observed)                                                                                                                                                                                                                                        | Where                                                                                                       | Fix                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Two stacked bottom bars.** The tab nav (Painel/Imóveis/Inquilinos/Contas) sits above a _second_ row (avatar · language · settings · sign-out). Two strips consume the most valuable mobile real estate and split navigation.                            | `components/ui/mobile-nav.tsx`, `app/[locale]/(main)/layout.tsx`                                            | Collapse to **one** bar. Move profile/language/settings/sign-out behind the avatar (tap → sheet) or into a 5th "More" tab. |
| F2  | **English leaks into a Portuguese UI.** "Total Tenants", "Active Tenants", "Export", and the **entire guided tour** ("12 properties. 3 real scenarios… Next / Skip tour", "Owner/Tenant") render in English. In a PT/ES market this quietly erodes trust. | `components/features/people/people-view.tsx`, `components/shared/app-tour.tsx` / `guided-tour.tsx`, various | Route all remaining strings through `next-intl`; add to all catalogs (`messages/*.json`).                                  |
| F3  | **"Try Demo Mode" is broken.** The proxy's page auth-guard doesn't bypass for the `proman_demo` cookie, so the demo entry bounces to `/auth/signin`.                                                                                                      | `proxy.ts` (portal auth-guard)                                                                              | Treat a valid demo cookie as authenticated for portal pages (or issue a scoped demo token).                                |
| F4  | **Segmented control overflows.** People's "Tenants / Owners / Service Providers" is clipped by the adjacent "+" button.                                                                                                                                   | `components/features/people/people-view.tsx`                                                                | Make the segment row horizontally scrollable, or wrap; detach the "+" as a FAB.                                            |

### P1 — layout discipline (the "first screenful")

| #   | Finding                                                                                                                                                                                                                                                                     | Where                                          | Fix                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F5  | **Every screen opens with dead chrome.** A large H1 + subtitle restate the tab just tapped ("Tenants" / "Manage your tenants and their information"), plus a search box and **two full-width dropdowns**, before any data. On 390 px the actual list starts below the fold. | all `*-view.tsx` list screens                  | Drop the redundant H1/subtitle on mobile (the nav already labels the screen); collapse filters into a **bottom-sheet** ("Filter" button + active-filter chips). |
| F6  | **Filter walls repeat per screen.** Search + "All Types/All Statuses" (Portfolio), "All Properties/All" (People) stacked vertically everywhere.                                                                                                                             | `property-list.tsx`, `people-view.tsx`, others | One reusable `<FilterSheet>`; show only active filters as removable chips inline.                                                                               |
| F7  | **Cryptic status chips.** Portfolio shows "NA 4 / LR 0 / OM 4" with no legend.                                                                                                                                                                                              | `property-list.tsx`                            | Use words or localized short labels + a tooltip/legend; keep counts.                                                                                            |
| F8  | **Heavy truncation.** Unit names/addresses cut to "Suns…", "Rua D…"; the width isn't used.                                                                                                                                                                                  | `property-list.tsx`, unit rows                 | Two-line clamp with meaningful wrapping; show city as a secondary line, not a mid-word cut.                                                                     |
| F9  | **Nested cards & asymmetric stat grids.** Building cards contain unit cards (cards-in-cards, against `CLAUDE.md`/`DESIGN_AWARD.md`); People shows a 2 + 1 orphan stat grid.                                                                                                 | `property-list.tsx`, `people-view.tsx`         | Un-nest units into flat, indented rows; make stat grids symmetric (single row that scrolls, or 3-up that wraps evenly).                                         |

### P2 — behavioural depth (close the habit loop)

| #   | Finding                                                                                                                                                                                                                            | Where                                             | Fix                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| F10 | **Only the loss half of the loop exists.** Overdue rent is well framed (red €1 100), but there's no **win/all-clear** state or **streak**, so nothing pulls the user back once things are handled. See `PRODUCT_AUDIT_2026.md` §3. | dashboard `action-panel.tsx`, `overview-view.tsx` | Add an "all clear / inbox-zero" reward and a monthly on-time-compliance streak; celebrate the first receipt of the cycle. |
| F11 | **The best asset competes for the first screen.** The triage panel (overdue · maintenance · leases-expiring) shares screen one with a tour, a redundant header, and three stat tiles.                                              | dashboard                                         | Make triage the unambiguous hero on mobile; demote stat tiles to a compact strip below it.                                |

---

## 3. Psychological read (Hook loop)

| Stage               | Today                                                                                                                                | Recommendation                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Trigger**         | Deadline-driven, but external triggers (email/push) only recently wired (`PRODUCT_AUDIT_2026.md` §5).                                | Keep pushing reminders _out_ of the app so the loop can start off-app.       |
| **Action**          | The dashboard triage panel is excellent — a prioritized worklist. But entry friction is high: chrome-before-content on every screen. | Cut the first-screenful chrome (F5–F6). Fewer taps to the one job.           |
| **Variable reward** | Loss framing only. No "all clear", no streak, no first-of-cycle celebration.                                                         | Add the reward half (F10). Variable, honest, tied to real compliance.        |
| **Investment**      | Data entry builds switching cost (good). Onboarding checklist exists.                                                                | Make progress visible and re-entrant; a streak is investment that compounds. |

**Cognitive-load principle for the whole app:** _chrome earns its place only if it
represents real hierarchy._ A title that repeats the nav, a filter you rarely
change, and a subtitle that restates the obvious are all pure load on a phone.

---

## 4. Prioritised roadmap

**Now (P0):** one bottom bar (F1) · finish i18n incl. the tour (F2) · fix demo
auth-bypass (F3) · fix segment overflow (F4).

**Next (P1):** kill redundant screen headers + move filters to a bottom-sheet
(F5–F6) · relabel status chips (F7) · reduce truncation (F8) · un-nest cards &
even up stat grids (F9).

**Later (P2):** all-clear win-state + compliance streak (F10) · make triage the
mobile hero (F11) · roll the FilterSheet pattern app-wide.

Each P0/P1 item is a small, self-contained PR; none require schema or API changes.

---

## 5. Brand / icon

The wordmark is set; the mark is moving to the refined **Roman-arch + keystone**
("option D / E-series") to read as an official European platform while staying
warm (Mediterranean terracotta). Once the variant is chosen, regenerate the full
asset set: `app/icon.svg`, `public/lares-{mark,logo}.svg`, PWA `icon-192/512`,
`apple-touch-icon`, `opengraph-image`, and the in-app `brand-logo.tsx` mark.

---

## 6. Relationship to existing docs

This doc is the **mobile + behavioural** layer. It defers:

- visual tokens & contrast → `DESIGN_AWARD.md`
- desktop IA & the single-IA decision → `UX_AUDIT_2026.md`
- product strategy, North-Star, the habit-loop thesis, PII/trigger wiring →
  `PRODUCT_AUDIT_2026.md`

It should be revisited after the P0/P1 work ships, with fresh 390 px captures in
both themes.
