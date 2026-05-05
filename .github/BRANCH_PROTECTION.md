# Branch Protection Rules

## Branching Model

This repository uses **trunk-based development**:

- `main` — production-only, fully protected. All changes arrive via PR.
- `feature/<id>-description` — short-lived feature branches, PR to `main`.
- `fix/<id>-description` — short-lived bug fix branches, PR to `main`.
- `release/vX.Y.Z` — created automatically by `release.yml`, PR to `main`, auto-merged by the workflow.
- `hotfix/<description>` — critical patches branched from `main`, PR back to `main`.

There is no long-lived `develop` branch. Dependabot branches follow the standard `dependabot/**` pattern.

---

## Branch Naming Convention

| Prefix                  | Purpose                  | Example                        |
| ----------------------- | ------------------------ | ------------------------------ |
| `feat/<id>-description` | New feature              | `feat/7.3-lease-expiry-alerts` |
| `fix/<id>-description`  | Bug fix                  | `fix/157-unused-nav-helper`    |
| `chore/<description>`   | Maintenance              | `chore/upgrade-prisma-7`       |
| `release/vX.Y.Z`        | Automated release        | `release/v1.14.0`              |
| `hotfix/<description>`  | Critical patch from main | `hotfix/auth-token-leak`       |

---

## Apply Branch Protection (run once after repo setup)

The `branch-protection-config.json` file in this directory contains the ready-to-apply configuration.

```bash
# Requires: gh auth login with admin scope on the repo
gh api repos/JIGLE/proman/branches/main/protection \
  --method PUT \
  --input .github/branch-protection-config.json
```

### Required status checks configured

| Check name                 | Workflow            |
| -------------------------- | ------------------- |
| `Lint & Type Check`        | `ci.yml`            |
| `Unit Tests`               | `ci.yml`            |
| `Build validation`         | `ci.yml`            |
| `Dependency Security Scan` | `security-scan.yml` |
| `CodeQL Security Analysis` | `security-scan.yml` |

### Notes on the release workflow

`release.yml` creates a `release/vX.Y.Z` branch and opens a PR to `main`. It then calls
`gh pr merge --squash` to merge it. Since the workflow token has `contents: write` and
`pull-requests: write`, this works when `enforce_admins: false` (the current config).

If you later enable `enforce_admins: true`, the release workflow will need either:

- A **fine-grained PAT** (stored as `RELEASE_TOKEN` secret) with bypass rights, or
- A **GitHub App** with branch protection bypass configured.

To verify current protection status:

```bash
gh api repos/JIGLE/proman/branches/main/protection | jq '{
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  required_checks: [.required_status_checks.contexts[]],
  enforce_admins: .enforce_admins.enabled,
  force_push_allowed: .allow_force_pushes.enabled
}'
```

---

## Verify protection is active

```bash
# Should return 403 when trying to push directly to main
git push origin main --dry-run
```
