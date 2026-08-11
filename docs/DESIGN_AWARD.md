# Design Award — Lares's audit-and-elevate loop

A repeatable loop for driving Lares's UI to an award-level bar, adapted from the
Katei `design-award` skill. It does **not** restyle: Lares already has a
deliberate identity (Pine Teal + Terracotta, Plus Jakarta Sans + Syne, the token
system in `app/globals.css`, the 4-zone modal). This loop raises _execution_ until
that identity reads as inevitable — in **all three themes** (dark, light, OLED)
and **all four languages** (pt/en/es/it).

> Provenance: method ported from Anthropic's `design-award` skill (Katei repo).
> The scorecard rows and the five taste tests transfer almost verbatim; the
> staging data, capture walk, signature moments, and anti-patterns are re-seeded
> from Lares's own screens.

## The rule

**One finding = one commit = one verified fix.** Severity order:
truth bugs → accessibility → usefulness → craft → delight. Taste calls that
override a defensible alternative get one line of _why_ in the commit body.

## The loop

### 1. Stage — a realistic portfolio, never empty

Lares ships **demo mode** (`lib/demo/`), the analog of Katei's `seed.mjs`: a
12-property portfolio across Lisbon/Porto/Barcelona with real tenants, leases,
receipts, expenses, tickets, and both owner + tenant perspectives. It is
auth-free at the app layer but the portal guard in `proxy.ts` still needs a
NextAuth session, and the locale-prefixed sign-in route 404s in dev — so the
capture script mints a session JWT directly with `NEXTAUTH_SECRET` (see
`scripts/design-capture.mjs`).

Boot: `.env` with `NODE_ENV=development` + `NEXTAUTH_URL=http://localhost:3000` +
a 32-char `NEXTAUTH_SECRET` (leave `DATABASE_URL` unset → mock fixtures),
then `npm run dev`.

### 2. Capture — every flagship screen, all themes, mobile + desktop

```
NO_PROXY=localhost NEXTAUTH_SECRET=<same-as-.env> \
  node scripts/design-capture.mjs --tag before
```

Writes to `.design-award/shots/<tag>/`. Themes are forced via
`localStorage['situs-theme']` = `light|dark|dark-oled` (the `ThemeProvider` in
`lib/contexts/theme-context.tsx` stamps a class + `data-theme` on `<html>`).
**Read every image** — a finding without a screenshot or code reference doesn't
count. Re-run with `--tag after` and compare.

### 3. Grade — the scorecard

Score each row **0/1/2 per screen** (0 = fails, 1 = correct, 2 = award-level).
Target **≥ 90% overall, no row at 0**. Automated inputs where computable:
`npm run lint:colors` (craft + theme-truth), `@axe-core/playwright` (a11y),
`npm run i18n:check` (i18n completeness).

| Row                   | The bar at 2                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Craft & precision** | Alignment intentional; `tabular-nums` on every money/number column; spacing on one rhythm; no wrap/overflow at 390px in pt/en/es/it                 |
| **Signature moment**  | Exactly one per screen, serving its job — the dashboard "Tarefas de hoje" greeting, Financials' Net figure — everything else recedes                |
| **Hierarchy honesty** | Structure encodes meaning: cards mean grouping (never nested), the 4-zone modal's zones map to real states, eyebrows label truthfully               |
| **Microcopy**         | Active voice, user-named objects ("Record payment", not "Submit"), consistent action names across a flow, every empty state invites the next action |
| **Accessibility**     | Text ≥ 4.5:1 in **all three themes**; keyboard-complete; charts/icons carry `aria-label`; reduced-motion honored                                    |
| **Motion restraint**  | Purposeful only; calm easing; no bounce/elastic; one animation system per surface (CSS keyframes _or_ Framer, not both)                             |
| **i18n completeness** | Every user string in all four catalogs (pt/en/es/it); ICU plural/interpolation correct; no hardcoded English (esp. tenant portal)                   |
| **Truthfulness**      | No number silently wrong; **no token that fails to remap** — the light/OLED themes must not render dark-on-dark                                     |
| **Taste & restraint** | Passes every taste test below; taste calls recorded in commit bodies                                                                                |

### 4. Elevate — the five taste tests (run on every screen)

- **Squint** — blur it: does hierarchy survive? Most important = most visible.
- **Remove-one-thing** — delete the least-earning element; if the screen improves, cut it.
- **Swap** — would this look at home in a generic admin template? Then it's inherited, not chosen.
- **Signature-vs-gimmick** — does the bold moment serve the job or decorate it?
- **Silence** — stage with nothing due: does it feel calm and inviting, or merely empty?

### 5. Verify (per finding, before commit)

Re-drive the changed screen in the running app in **all three themes**;
`npm run lint:colors` count dropped; `npm run type-check`; `npm run lint`
(`--max-warnings=0`); `npm test`; `npm run i18n:check` if strings changed.
Re-capture (`--tag after`) and compare.

**If the change touches `app/globals.css`, any `docs/*.md`, or anything else
Tailwind's content scanner reads:** also run `npm run build` (or load the app
in a running dev server) and confirm no PostCSS/Tailwind parse error. Tailwind
v4 scans `.md` files for candidate classes too — a stray bracket-class string
in prose (e.g. an arbitrary-value class like `text-[ var(--color-…) ]` written
as one contiguous token, with an invalid CSS character such as a raw pipe inside
the brackets) can generate invalid CSS and break the _entire app's_ stylesheet,
silently, since `tsc`/`eslint`/`vitest` never compile CSS and won't catch it.
Note the spaces added inside the brackets above: they are deliberate, so this
warning does not itself become the landmine it describes. This has already
happened twice in this repo's docs — see the git history on this file.

## Lares anti-patterns (a screen matching one is wrong)

- A **neutral literal** (`bg-zinc-900`, `text-zinc-400`) anywhere in `components/`
  or `app/` — it won't remap and breaks light/OLED. Use `var(--color-*)` tokens
  or the Badge/Button semantic variants. Ratcheted by `scripts/check-color-tokens.js`.
- **Nested cards** (a `Card` inside a `Card`) — flatten to one surface + border.
- Two parallel animation systems on one component (CSS keyframe + Framer).
- Gray text on a colored ground; pure black/white (always tint via a token).
- A money column without `tabular-nums`.
- Hardcoded English (the tenant portal is the current worst offender).
- Inventing a new accent hue instead of reusing success/warning/info/destructive
  - the Pine-Teal primary / Terracotta secondary.

## Token mapping reference (neutral → Lares token)

Mirrors the already-clean `overview-view.tsx`. Applied by
`scripts/migrate-neutral-tokens.mjs` (review each diff — the mapping is contextual).

| Literal                           | Token                                      |
| --------------------------------- | ------------------------------------------ |
| `text-zinc-50/100/200`            | `text-[var(--color-foreground)]`           |
| `text-zinc-300/400/500/600`       | `text-[var(--color-muted-foreground)]`     |
| `bg-zinc-900` (card/dialog/sheet) | `bg-[var(--color-card-solid)]`             |
| `bg-zinc-900/60` (panel)          | `bg-[var(--color-card)]`                   |
| `bg-zinc-800` (popover/dropdown)  | `bg-[var(--color-popover)]`                |
| `bg-zinc-800/40–50` (hover)       | `bg-[var(--color-surface-hover)]`          |
| `bg-zinc-800/60` (selected)       | `bg-[var(--color-surface-pressed)]`        |
| `bg-zinc-950/50` (input well)     | `bg-[var(--color-muted)]/30`               |
| `border-zinc-600/700/800`         | `border-[var(--color-border)]`             |
| `hover:border-zinc-500/700`       | `hover:border-[var(--color-border-hover)]` |
| `divide-zinc-800`                 | `divide-[var(--color-border)]`             |
| `text-green-*`                    | the `--color-success` token                |
| `text-red-*`                      | the `--color-destructive` token            |
| `text-yellow-*`                   | the `--color-warning` token                |

## Repo facts (that cost real time)

- **Themes are three classes** (`light`, `dark`, `dark-oled`) + `data-theme` on
  `<html>`; tokens live in `app/globals.css` (`@theme` = dark default, then
  `:root.light`, `:root.dark-oled` overrides). Any token you use must be defined
  in **all three** blocks or it won't remap.
- **Shared primitives break every consumer.** `components/ui/sheet.tsx` hardcoding
  `bg-zinc-900` broke _every_ Sheet-based modal in light/OLED. Fix primitives first.
- The `/portfolio?modal=<id>` route renders `property-detail-view.tsx` (not
  `property-detail-modal.tsx`) — check which component a surface actually mounts.
- Capture auth: mint a JWT with `next-auth/jwt` `encode({secret, token:{…}})`
  and set the `next-auth.session-token` cookie; the demo cookie alone won't pass
  the portal guard.

## Definition of done

Scorecard ≥ 90%, no row at 0 · `lint:colors` count strictly lower · type-check,
lint, and `npm test` green · both-theme after-captures reviewed vs before · one
commit per finding, taste calls named.
