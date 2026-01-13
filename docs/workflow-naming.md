Workflow naming convention

We use a simple convention to make workflow intent and scope clear from the filename.

Top-level workflows (kept small):
- `ci.yml` — Continuous integration: tests, lint, type-check, and build on main.
- `release-publish.yml` — Release pipeline: build images, package Helm chart, and create GitHub Release (DRY_RUN default true).

Archived workflows:
- Moved to `docs/archived-workflows/` to avoid accidental execution. These are kept for reference.

Guidelines:
- Prefer `ci.yml` for developer-facing CI and small checks.
- Keep `release-*.yml` for release workflows (publishing images, packaging charts, creating releases).
- Pin critical actions to full commit SHAs in release workflows (org policy may require this).
- Add `workflow_dispatch` with `dry_run` inputs to release flows so they can be executed manually.
- Default `dry_run` to `true` for publish workflows.
