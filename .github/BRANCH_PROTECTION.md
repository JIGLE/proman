# Branch Protection Rules Configuration

# This file documents the recommended branch protection rules for this repository

# These rules should be configured in GitHub Settings → Branches → Branch protection rules

## Main Branch Protection (main)

- **Branch name pattern**: `main`
- **Require a pull request before merging**
  - Required approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed: ✅
  - Require review from Code Owners: ✅
  - Restrict who can dismiss pull request reviews: ✅ (Repository administrators)
- **Require status checks to pass before merging**
  - Require branches to be up to date before merging: ✅
  - Status checks:
    - `lint-type` (CI - Lint & Type Check)
    - `test` (CI - Unit Tests)
    - `build` (CI - Build validation)
    - `security-scan` (Security Scan)
- **Require conversation resolution before merging**: ✅
- **Include administrators**: ✅
- **Restrict pushes that create matching branches**: ✅
- **Allow force pushes**: ❌
- **Allow deletions**: ❌

## Develop Branch Protection (develop)

- **Branch name pattern**: `develop`
- **Require a pull request before merging**
  - Required approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed: ✅
- **Require status checks to pass before merging**
  - Status checks:
    - `lint-type` (CI - Lint & Type Check)
    - `test` (CI - Unit Tests)
- **Include administrators**: ✅
- **Allow force pushes**: ❌
- **Allow deletions**: ❌

## Feature Branch Protection (feature/\*\*)

- **Branch name pattern**: `feature/**`
- **Require a pull request before merging**
  - Required approvals: 1
- **Require status checks to pass before merging**
  - Status checks:
    - `lint-type` (CI - Lint & Type Check)
- **Include administrators**: ✅
- **Allow force pushes**: ❌
- **Allow deletions**: ❌

## Notes

- Status check names may vary slightly based on workflow job names
- Code owners are defined in `.github/CODEOWNERS`
- These rules ensure quality while allowing efficient development workflow

---

## Programmatic Setup

Use the GitHub CLI to apply these rules. Replace `OWNER/REPO` with your repository.

### Main branch

```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Lint & Type Check",
      "Unit Tests",
      "Build validation",
      "Dependency Security Scan",
      "Custom Security Scan",
      "CodeQL Security Analysis"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "dismissal_restrictions": {}
  },
  "required_conversation_resolution": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

### Develop branch

```bash
gh api repos/OWNER/REPO/branches/develop/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Lint & Type Check",
      "Unit Tests"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

> **Tip:** Run `gh auth status` to verify you have `admin` scope before applying these rules.
