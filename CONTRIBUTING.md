# Contributing

This repository follows simple branch and PR conventions to keep CI fast, reviews clear, and releases reliable.

Branch naming
- `main` — protected, release-ready.
- `develop` — integration branch (optional).
- `feature/<short-description>` — new features.
- `bugfix/<short-description>` — bug fixes targeting `develop` or `main`.
- `hotfix/<short-description>` — urgent fixes for `main`.
- `chore/<short-description>` — non-functional changes (CI, docs, deps).

PR workflow
- Open PRs against `main` (or `develop` if used).
- Require at least one approving review before merge.
- Ensure CI checks pass: `Lint & Type Check`, `Unit Tests`, and `Build` must be green.
- Use clear titles and a short description; reference related issue numbers when available.

Branch protection & automated rules (recommended)
- Require status checks: `Lint & Type Check`, `Unit Tests`, `Build`.
- Require pull request reviews before merging.
- Disable force-push to protected branches.
- Enable `Automatically delete head branches` (this repo has it enabled) to keep remotes tidy.

E2E / Playwright guidance
- Long-running E2E tests are opt-in to avoid noisy runs:
  - Run Playwright manually via the `Playwright E2E Tests` workflow (`workflow_dispatch`).
  - Or trigger E2E in the consolidated CI by either:
    - Manually dispatching the `CI - Consolidated` workflow with `run_e2e=true`, or
    - Adding the `run-e2e` label to a Pull Request.

Security & secrets
- Never commit secrets into the repo or workflow logs.
- Use repository `Secrets` or protected environments for tokens and webhook URLs.

Release and webhook notes
- Releases are managed via the `release.yml` workflow. CI can notify a running instance when `ENABLE_RELEASE_NOTIFY=true` and secrets are configured.
- The in-app update webhook is disabled by default; to re-enable set `UPDATE_WEBHOOK_ENABLED=true` in your deployment.

Thanks for contributing — open an issue or a PR if you need help with the process.
# Contributing to Proman

## Development Workflow

### Branch Strategy

We use a simple trunk-based development model:

- **`main`** - Production-ready code
- **Feature branches** - Created from `main` for new features/fixes

### Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Push and create a Pull Request
4. Wait for CI checks to pass
5. Get code review approval
6. Merge to `main`

### Version Control

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (`x.0.0`) - Breaking changes
- **MINOR** (`0.x.0`) - New features, backward compatible
- **PATCH** (`0.0.x`) - Bug fixes, backward compatible

### Release Process

Releases are automated via GitHub Actions:

1. Go to **Actions** → **Release**
2. Click **Run workflow**
3. Select version bump type (`patch`, `minor`, `major`)
4. Optionally add release notes
5. The workflow will:
   - Bump version in `package.json`
   - Create a git tag
   - Create a GitHub Release
   - Build and push Docker image to GHCR

### CI Pipeline

Every push/PR triggers the CI pipeline:

| Stage | Description | Timeout |
|-------|-------------|---------|
| Lint & Type Check | ESLint + TypeScript | 5 min |
| Unit Tests | Vitest with coverage | 10 min |
| Build Validation | Docker build test | 15 min |

### Code Quality Requirements

Before merging:

- [ ] All CI checks pass
- [ ] Test coverage maintained or improved
- [ ] No TypeScript errors
- [ ] No ESLint warnings/errors
- [ ] Documentation updated if needed

## Setting Up Branch Protection (Repository Admin)

Configure these settings in **Settings** → **Branches** → **Branch protection rules**:

### For `main` branch:

```
Pattern: main
```

**Recommended settings:**

- [x] Require a pull request before merging
  - [x] Require approvals: 1 (for team projects)
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Required checks:
    - `Lint & Type Check`
    - `Unit Tests`
    - `Build Validation`
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings
- [ ] Restrict who can push to matching branches (optional)

## Local Development

### Prerequisites

- Node.js 22+
- npm 10+
- Docker (for build testing)

### Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build Docker image
docker build -t proman:local .
```

### Testing

We use Vitest with React Testing Library:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/path/to/file.test.tsx
```

### Database

Development uses SQLite by default:

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio
```
