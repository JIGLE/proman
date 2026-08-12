Workflow naming convention

We use a simple convention to make workflow intent and scope clear from the filename.

Active workflows (`.github/workflows/`):

- `ci.yml` — Continuous integration: lint, type-check, unit tests, build, and smoke tests on
  every PR to `main` and every push to `main` (plus E2E smoke and the mobile audit on PRs, and
  the full Playwright suite via the `run-e2e` label or manual dispatch).
- `security-scan.yml` — Dependency audit, custom security scan, CodeQL, dependency review, and
  secret scanning. Runs on push/PR to `main`, nightly, and manual dispatch.
- `release.yml` — Two-phase release flow: `prepare` (manual dispatch) opens a version-bump PR;
  `publish` (push to `main`) tags and cuts the GitHub Release once a version bump lands, then
  verifies version integrity. On pushes that are not a version bump it reports release lag.
- `deploy-ghcr.yml` — Builds the Docker image, scans it with Trivy, and pushes to GHCR (tag
  push, manual dispatch, or `repository_dispatch`).
- `reusable-verify.yml` — **Reusable only** (`workflow_call`), never triggers on its own. Holds
  the lint/type-check/test trio called by `ci.yml`. Its job names (`Lint & Type Check`,
  `Unit Tests`) are required status checks in `.github/BRANCH_PROTECTION.md` — don't rename them
  without updating that doc and the branch protection config together.

Composite actions (`.github/actions/`):

- `start-app/` — Creates the SQLite schema, boots the standalone production server from the
  downloaded `.next` artifact, and waits for it. Used by all four `ci.yml` jobs that need a
  running app. Exists because the four copies it replaced each had to get two non-obvious
  details right — the schema step and the absolute `DATABASE_URL` — and a comment explaining
  them only helps where every caller inherits it.
- `resolve-scan-base/` — Works out a valid git base commit for the diff-scoped secret scans.

Retired:

- `production.yml` ("Production Gate") — deleted. It duplicated `ci.yml`'s verify and build on
  the same `push: main` event, and its version-integrity check raced `release.yml` for the tag
  it was checking against. Both of its real checks moved into `release.yml`.
- Older workflows moved to `docs/archived-workflows/` to avoid accidental execution. Kept for
  reference only — see `docs/ARCHIVED.md`. Note these still describe the Helm/Kubernetes
  deployment path that no longer exists.

Guidelines:

- Keep filenames plain and descriptive (`<concern>.yml`); avoid vague qualifiers like
  "-consolidated" that only made sense relative to a past, smaller state.
- Before adding a new job that runs lint/type-check/test/build, check whether it belongs in
  `reusable-verify.yml` instead of a third copy. Before adding a job that boots the app, use
  `.github/actions/start-app`.
- Install with a bare `npm ci`. It used to be `npm ci || (npm install --package-lock-only …)`,
  which silently regenerated the lockfile on a mismatch and then tested a dependency tree
  nobody had reviewed — a green run that proved nothing about what ships.
- Pin third-party actions to full commit SHAs. `node scripts/pin-actions.mjs` rewrites them and
  `--check` reports what is still on a mutable tag; actions under `actions/` and `github/` are
  left on tags deliberately.
- Set `cancel-in-progress` to `${{ github.event_name == 'pull_request' }}`, not `true`.
  Cancelling superseded PR runs is the point; cancelling a `main` run leaves a shippable commit
  unverified, which has already happened here (runs #540/#541).
- Add `workflow_dispatch` to workflows that would otherwise only run on push/schedule, so they
  can be manually re-triggered and tested without waiting for the next real trigger.
- A gate that cannot fail is not a gate. When a step writes a report another step judges,
  a missing report must fail — `exit 0` on "no report" is indistinguishable from "no findings",
  and both the mobile audit and the security scan shipped that bug.
- Update this file whenever a workflow is added, renamed, or retired — it drifted out of sync
  with the actual `.github/workflows/` contents once already; don't let that happen again.
