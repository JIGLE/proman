Workflow naming convention

We use a simple convention to make workflow intent and scope clear from the filename.

Active workflows (`.github/workflows/`):

- `ci.yml` — Continuous integration: lint, type-check, unit tests, build, and smoke tests on
  every PR to `main` (plus optional Playwright E2E via label or manual dispatch).
- `security-scan.yml` — Dependency audit, custom security scan, CodeQL, dependency review, and
  secret scanning. Runs on push/PR to `main`, nightly, and manual dispatch.
- `production.yml` — Post-merge gate on push to `main`: re-verifies + builds, then checks
  `package.json`'s version against the latest git tag and warns if `main` has drifted far ahead
  of the last release.
- `release.yml` — Two-phase release flow: `prepare` (manual dispatch) opens a version-bump PR;
  `publish` (push to `main`) tags, cuts the GitHub Release, and packages the Helm chart once a
  version bump lands.
- `deploy-ghcr.yml` — Builds and pushes the Docker image to GHCR (tag push, manual dispatch, or
  `repository_dispatch` from `release.yml`), with an optional Kubernetes rollout step.
- `reusable-verify.yml` — **Reusable only** (`workflow_call`), never triggers on its own. Holds
  the lint/type-check/test trio shared by `ci.yml` and `production.yml` so the two callers can't
  drift out of sync. Its job names (`Lint & Type Check`, `Unit Tests`) are required status
  checks in `.github/BRANCH_PROTECTION.md` — don't rename them without updating that doc and the
  branch protection config together.

Archived workflows:

- Moved to `docs/archived-workflows/` to avoid accidental execution. Kept for reference only —
  see `docs/ARCHIVED.md`.

Guidelines:

- Keep filenames plain and descriptive (`<concern>.yml`); avoid vague qualifiers like
  "-consolidated" that only made sense relative to a past, smaller state.
- Before adding a new job that runs lint/type-check/test/build, check whether it belongs in
  `reusable-verify.yml` instead of a third copy.
- Pin critical actions to full commit SHAs in release/deploy workflows where the org's policy
  requires it.
- Add `workflow_dispatch` to workflows that would otherwise only run on push/schedule, so they
  can be manually re-triggered and tested without waiting for the next real trigger.
- Update this file whenever a workflow is added, renamed, or retired — it drifted out of sync
  with the actual `.github/workflows/` contents once already; don't let that happen again.
