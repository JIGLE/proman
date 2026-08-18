# Situs V1 pilot — checklist

Living tracker. `docs/V1_READINESS.md` is the dated assessment that produced these items; this
file is what changes as work lands. Updated as part of each increment, not at the end.

**Status key**: ✅ done · 🔨 in progress · ⬜ open · ⏸️ deferred (with a reason)

---

## P0 — must fix before a pilot

| #   | Item                                             | Status | Evidence                                                                                                                                                                                                  |
| --- | ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tax connector fails closed on unsupported `mode` | ✅     | `lib/tax/connectors/mode-guard.ts`, shared by PT and ES. Widening `SIMULATED_MODES` to include `live` turns **6 cases red across both countries** — that is the proof the guard is shared, not duplicated |
| 2   | Receipt lifecycle transition is atomic           | ✅     | Void runs reversal + lifecycle write in one `$transaction`; `reverseAllocationsForReceipt` takes an optional `tx`. 2 of 4 cases discriminate against the old code                                         |
| 3   | Tax aggregations rounded                         | ✅     | `lib/utils/money.ts`; applied to income-summary and the `getAnnualTaxSummary` totals feeding the PT/ES tax forms                                                                                          |

**Not done, deliberately:** a schema enum on `TaxAuthorityConnector.mode`. Narrowing a live
`String` column needs `prisma db push`, which `AUTO_DB_SCHEMA_SYNC` applies on the next container
start and which fails if any row holds an off-list value. Migration risk on a running instance for
marginal gain — no API route writes `mode` at all, and the code guard is what actually stops the
harm.

---

## P1 — required for a credible pilot

| #   | Item                                                  | Status | Notes                                                                                                                                                                                            |
| --- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4   | Allocation write path has a test                      | ✅     | Unit: `service.transaction.test.ts` pins the boundary structurally. **SQL: covered after all** — `e2e/workflow-full-chain.spec.ts` runs the real write path against real SQLite via the API (#6) |
| 4b  | …DB-backed integration test _in Vitest_               | ⏸️     | Still blocked: `prisma db push` is refused by Prisma's AI-agent guard. **Not bypassed.** Lower value now that #6 exercises the same writes against a real database                               |
| 5   | Multi-month + fingerprint-idempotency test cases      | ✅     | 22 cases across 3 files, each proved by reverting the line it defends — see below. Still mocked Prisma, still no SQL                                                                             |
| 6   | E2E happy path end to end through receipt + audit     | ✅     | `e2e/workflow-full-chain.spec.ts` — 10 steps, ids carried forward, run green 3× consecutively. See below                                                                                         |
| 7   | Spain behind `TaxConnector`                           | ✅     | `lib/tax/connectors/es-nrua.ts` over `NRUARegistration`, wrapping the existing `validateNRUAData`. 18 cases                                                                                      |
| 8   | Connector registry — domain stops naming an authority | ✅     | `registry.ts`; `receipts/service.ts` resolves by `Property.country` instead of importing `ptAtConnector`. Null country → PT, so existing rows are unaffected                                     |

### P1 #5 — what the 22 cases cover, and what they still do not

| File                                    | Cases | Proved by reverting                             | Result                     |
| --------------------------------------- | ----- | ----------------------------------------------- | -------------------------- |
| `allocation/engine.test.ts` (new block) | 5     | `break` after the first pass-1 entry            | **5 of 18 red**            |
| `allocation/service.allocate.test.ts`   | 10    | `if (existing > 0) return null`                 | **1 red** (the named case) |
| ”                                       | ”     | widening `reversedAt: null` to every allocation | **1 red** (the named case) |
| `bank/import.dedupe.test.ts`            | 7     | the `if (existing)` fingerprint block           | **5 of 7 red**             |

The two import cases that survive the revert are the "what is NOT a duplicate" pair — they must
not depend on the guard, and they don't.

**One inert test was caught and fixed before it landed.** The dedupe file's central assertion
("the waterfall does not run a second time") originally compared the allocation-call count before
and after a re-import. The fixture scored 0.55 against the 0.85 auto-match threshold, so it never
auto-matched, and the assertion was comparing 0 to 0 — green whether or not the guard existed.
Fixed by giving the lease a known counterparty IBAN (worth 0.45) and asserting
`autoMatched === 1` as an explicit precondition, so fixture drift fails loudly instead of quietly
disarming the test.

**Not covered by the unit tests:** they use mocked Prisma clients. No SQL runs, so the `@unique`
constraint on `BankTransaction.fingerprint` is not exercised there — but #6's final step now does
exactly that against real SQLite.

### P1 #6 — the full-chain walkthrough

`e2e/workflow-full-chain.spec.ts` walks one payment from bank statement to filed receipt,
carrying each stage's output into the next: property → tenant → lease → import → confirm →
allocation → rent period → receipt → emit → audit trail, then re-imports to prove the no-op.

Driven through the API rather than the UI. The chain is what is under test, and this suite's
documented failure mode is selector drift silently disarming a spec. Every call goes through the
real route handlers, Zod, auth middleware, Prisma and SQLite.

**Proved by breaking the chain, twice:**

| Break                                               | Result                                                         |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Drop `allocateReceipt` after the receipt is created | ✗ "the receipt was never allocated to a reference month"       |
| Drop the `emitted → EMIT_RECEIPT` audit mapping     | ✗ "audit trail is missing EMIT_RECEIPT for this run's records" |

**Two inert-test traps were hit and fixed during authoring**, both found by tightening rather
than by luck:

1. _The audit assertion read the account-wide trail._ It checked five actions appeared somewhere
   in the last 50 entries — which passes on any database where a PREVIOUS run left them, whether
   or not this run's chain worked. Now scoped to the four ids this run mints (sync job, movement,
   lease, receipt), so every matched row is necessarily ours. Scoping it immediately exposed that
   the expected action was wrong: `OVERRIDE_MATCH`, not `CONFIRM_MATCH`.
2. _The fixture taught itself across runs._ The tenant IBAN is the matcher's learning key, so a
   fixed one meant each run trained the next; on run two the engine found two leases scoring a
   perfect 1.0 and correctly refused to choose (`ambiguous_candidates`). Same class of problem in
   the name: token overlap on "Chain"/"Tenant" tied old runs at 0.55. Both now carry the run
   stamp in every token. Verified by running the spec **three times consecutively**, green each
   time — a spec that only passes against a clean database gets deleted the first time someone
   runs it twice.

**Environment note:** this sandbox's `dev.db` is stale against the schema (`correspondence`
columns missing), which breaks some dashboard reads. It does not touch the chain's tables and is
a local-data problem, not a code one — but `prisma db push` would fix it and is blocked, so it is
recorded here rather than worked around.

---

## P2 — strongly desirable

| #   | Item                                             | Status | Notes                                                                                                                                                                                                                      |
| --- | ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Connector UI states simulated status honestly    | ✅     | Both surfaces now say _simulated, nothing transmitted_, name the authority, and render an unsupported mode as an error. `live` no longer styled green — it was the colour of "working" on the one mode that refuses to act |
| 10  | UX pass: empty / loading / error states          | ✅     | Sampled, and smaller than feared — see below. One central gate, 6 cases. Live verification blocked by #11's pending migration                                                                                              |
| 11  | Portal token revocation                          | ✅     | `Tenant.portalAccessRevokedAt` + `DELETE /api/tenants/[id]/portal-link`. 6 cases. **Needs one `prisma db push`** — see below                                                                                               |
| 12  | Analytics float rounding                         | ⬜     | ~8 sites in `analytics-service.ts`. Dashboard drift is cosmetic — genuinely P2                                                                                                                                             |
| 13  | Stop echoing `error.message` in user-facing 500s | ⬜     | 15 routes; mostly health/debug, but `/api/distributions` is user-facing                                                                                                                                                    |

### P2 #11 — portal revocation, and the one thing it needs from you

Portal tokens are stateless signed JWTs, so expiry was the only thing that ever ended access: a
link forwarded to the wrong address, or one belonging to a tenant who had moved out, kept working
for up to seven days with no way to stop it.

**Worse, revocation appeared to already exist.** `tenantPortalService.revokeAccess` took a
tenantId, ignored it, and returned `{ success: true }`, commented "tokens are stateless and expire
naturally". Any caller would report success to a landlord while every outstanding link stayed
live — the same fabricated-success shape as the tax connector's D1 finding, applied to access
control. That stub is gone.

Now: `Tenant.portalAccessRevokedAt` is a revocation epoch. Verification refuses any token whose
`iat` is at or before it, so one write revokes every outstanding link; generating a new link
afterwards works normally. `iat` is whole seconds and the column is milliseconds, so a token
issued in the same second is ambiguous — it is refused, because over-rejecting costs one click
and under-rejecting leaves the link the owner just revoked working.

**⚠️ Requires `npx prisma db push` once.** The column is additive and nullable, so it is the
safest kind of migration — but the Prisma AI-agent guard refuses the command for me and **it was
not bypassed**. Consequences:

- **CI is fine.** `.github/actions/start-app` runs `npx prisma db push` as its first step, before
  the app boots, so every E2E job gets the column.
- **Deploy is fine.** `scripts/ensure-sqlite.js` applies additive changes on container start via
  `AUTO_DB_SCHEMA_SYNC` (default on).
- **A local `dev.db` is NOT fine until you push.** Verified, not assumed: with the stale local
  database `POST /api/tenants` answers 500 and `e2e/workflow-full-chain.spec.ts` fails at step 2.
  The unit tests pass either way — they mock Prisma — so **the revocation logic is proved and the
  live HTTP path is not.**

### P2 #10 — what the sample found

Measured rather than eyeballed, because the item had never been looked at.

A first pass by grep suggested 11 of 27 screens were missing a loading, empty or error state.
That was **misleading** — most of those screens read from `useApp()`, and loading/error are
handled centrally in `use-app-data.ts`, which dispatches `SET_LOADING`/`SET_ERROR` around one
fetch that populates every entity. Individual screens are not supposed to own it.

The real finding is narrower and worse:

|                                                   |                                                   |
| ------------------------------------------------- | ------------------------------------------------- |
| Screens reading `state.loading`                   | **2** of 27                                       |
| Screens reading `state.error`                     | **0**                                             |
| Feature components importing `page-skeletons.tsx` | **0** — seven purpose-built skeletons, none wired |
| Screens with an empty state                       | fine — 15 files use the empty-state illustrations |

So both flags were set correctly and read by almost nobody. The consequence is a screen that
states something false, which is the same failure the connector UI had:

- **While loading**, every list is `[]`, so a landlord on a slow connection is told "No properties
  yet" — not "loading" — on an account with forty properties.
- **If the fetch fails**, the only signal is a toast that auto-dismisses. The screen then settles
  on that same empty state permanently, with no error, no explanation, and no way to retry short
  of reloading the page.

`app/[locale]/(main)/loading.tsx` does not cover this: that is Next's route-level Suspense
fallback, already gone by the time the client-side fetch starts.

**Fix: one gate, not 25 screens.** `components/shared/app-data-gate.tsx` wraps `{children}` in the
main layout and renders a route-appropriate skeleton on first load, or an error panel with a
working retry. There is one fetch and one pair of flags, so there is one gate. Two decisions worth
keeping:

- it stands in only for the FIRST load — a background `refreshData()` after a mutation keeps the
  populated screen, because blanking a full page to a skeleton on every save would be worse than
  the bug;
- error beats loading, so a retry in flight keeps the failure visible instead of flicking to a
  skeleton.

6 cases; disabling the gate turns 4 red. 3 new i18n keys across all four locales, parity enforced
by `messages/locales.test.ts`.

**Not verified live, and this is why.** #11's `portalAccessRevokedAt` column does not exist in the
local `dev.db`, so every entity route answers 500 and `/` with it — which means Playwright's
`webServer` check cannot even start. So the gate's behaviour is proved by unit tests and by
disabling it, **not** against a running browser. One `prisma db push` clears this and the whole
E2E suite with it.

---

## P3 — after V1

| #   | Item                                                | Status | Notes                                                                       |
| --- | --------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| 14  | Doc consolidation, `docs/archive*` pruning          | ✅     | Done 2026-08-17 — 48 files deleted; git history retains them                |
| 15  | `CLAUDE.md` version drift                           | ⬜     | Says 1.16.3 against a shipped 1.24.0                                        |
| 16  | Admin › System status (connections, config, drift)  | ✅     | `/admin` + `GET /api/admin/system-status`. 19 unit cases + 3 E2E. See below |
| 16b | Owner/admin control page (payments, usage, tickets) | ⬜     | Still open. #16 covers operational status only, not account administration  |

### P3 #16 — Admin › System status

`/admin`, owner-only in the nav and `requireAdmin` on the API. One row per thing this instance
depends on, each answering three questions: what is it, what state is it in, and what do I do
about it.

| Group       | Checks                                                     |
| ----------- | ---------------------------------------------------------- |
| Platform    | schema drift, database reachability, PII encryption key    |
| Connections | tax authority per registered country, bank, email, billing |

**Why it exists.** The information was scattered across a server log, two per-user connector
screens and a set of environment variables. The schema-drift failure proved the cost: a missing
column takes down `findMany` for the whole model, so unrelated pages return 500 and the cause is
named only in a log line nobody is watching.

**Two design decisions worth keeping.**

1. **It renders outside `AppDataGate`.** A diagnostics page behind the same gate that fails when
   the app fails is not a diagnostics page. `/admin` is in `GATE_EXEMPT` and reads its own
   endpoint. Proved live: with the local database missing a column, every other screen showed
   "Couldn't load your data" while this page rendered and named the missing column.
2. **`simulated` is never styled as `ok`.** Severity is derived from the connectors' own
   `SIMULATED_MODES`, so widening that set for a real integration updates this page in the same
   move. The simulation disclosure is unconditional — an operator should not have to infer from
   a row's colour that nothing reaches a tax authority.

**Reachability was not free.** `canAccessPortalPath` derives access from the nav list, so `/admin`
silently redirected to `/dashboard` until it was added to `PORTAL_NAV_GROUPS`. Found by loading
the page in a browser, not by reading the code — the API worked the whole time.

**Proved by breaking each honesty rule**, one case red per break:

| Break                                            | Result                                                  |
| ------------------------------------------------ | ------------------------------------------------------- |
| Treat an unsupported connector mode as simulated | ✗ "escalates an unsupported connector mode to error"    |
| Report a failed drift check as in-sync           | ✗ "does not claim in_sync when the check itself failed" |
| Echo the raw driver error into the payload       | ✗ "never puts raw exception text in the payload"        |

**Verified live against a genuinely broken instance.** The endpoint returned schema `error` with
`Missing: tenants.portalAccessRevokedAt, correspondence_templates.userId, …` and the remedy
`Run npx prisma db push` — and surfaced pre-existing `correspondence_templates` drift nobody had
noticed. The E2E spec asserts only what holds in both states, since CI pushes the schema before
booting and sees in-sync.

---

## Deferred with a reason

**Portugal — import registered properties from the AT.** Reading a landlord's properties with
their matriz data (caderneta predial) needs an authenticated live AT connection, which does not
exist.

Simulating it is the worst option available. It would manufacture property records — areas,
matriz references, taxable values — that a landlord would reasonably trust and might file
against. That is D1's fabricated-acceptance problem moved from submissions to source data, and
source data is harder to notice being wrong.

What it would actually require:

1. An authenticated AT integration (the same one blocking `mode: "live"`).
2. A decision on where matriz data lives in the domain — new fields on `Property`, or a separate
   registry record it reconciles against.
3. A reconciliation story for properties already in Situs: match, merge, or duplicate, and who
   decides.

A CSV/manual import shaped so a future AT feed could reuse its parsing and validation is a
reasonable interim step. It is a new feature, so it belongs after V1.

**Live bank connection.** V1's bank integration is manual/CSV import. The UI must not imply
otherwise.

**Money → integer minor units.** 33 `Float` fields. The ledger defends itself with a half-cent
epsilon; migrating every money-handling service on a live instance is a redesign, not a fix.
Rationale in `V1_READINESS.md` §D3.

---

## Integration status — as it must be reported

```
Bank:      LIVE where the user has connected one — PSD2 account information
           (GoCardless). Simulated / CSV-only where they have not. Never
           asserted: read it from the "Signed-in account" and "Bank movements"
           checks on /admin, which derive it from the connection rows.
Portugal:  Sandbox / review / preparation only. No live AT endpoint.
           Connector refuses and logs in any other mode.
Spain:     Sandbox / review / preparation only. No live MITMA endpoint.
           Connector refuses and logs in any other mode.
```

The bank line changed on 2026-08-17 (PR #334). It previously read "Manual / CSV import only. No
live bank connection exists", which was true when written and false the moment a connection could
be made. **A line in this block is a claim with an expiry**: the commit that makes one false is the
commit that rewrites it. `lib/services/admin/system-status.ts` is the reference, because it is what
a user actually sees.
