# Contributing to Proman

## Branch Strategy

- **`main`** — protected, release-ready; all merges require a passing CI gate
- **`feature/<short-description>`** — new work branched from `main`
- **`fix/<short-description>`** — bug fixes
- **`hotfix/<short-description>`** — urgent production fixes
- **`chore/<short-description>`** — non-functional changes (CI, docs, deps)

## Pull Request Workflow

1. Branch from `main`
2. Push your branch and open a PR against `main`
3. All CI checks must be green: **Lint & Type Check**, **Unit Tests with Coverage**, **Production Build**
4. At least one approving review required (for team projects)
5. Merge — the head branch is auto-deleted

**PR checklist:**

- [ ] `npx tsc --noEmit` exits 0 (TypeScript strict mode)
- [ ] `npm run lint` exits 0 (no ESLint warnings)
- [ ] Tests pass and coverage is maintained or improved
- [ ] All new UI strings added to all three locale files (`messages/en.json`, `messages/pt.json`, `messages/es.json`)
- [ ] No secrets committed

## CI Pipeline

Five GitHub Actions workflows protect the repository:

| Workflow            | File                | Trigger                                    | Validates                                                                     |
| ------------------- | ------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| **CI**              | `ci.yml`            | Push to `main`/`develop`/`feature/**`; PRs | Lint, type-check, unit tests, build, smoke tests                              |
| **Production Gate** | `production.yml`    | Push to `main`                             | Lint, type-check, unit tests with coverage, production build                  |
| **Security Scan**   | `security-scan.yml` | Push to `main`; PRs; daily 02:00 UTC       | npm audit, custom security scan, CodeQL analysis, TruffleHog secret scan      |
| **Deploy to GHCR**  | `deploy-ghcr.yml`   | Git tag `v*`; manual dispatch              | Docker multi-platform build, push to `ghcr.io/jigle/proman`, SBOM attestation |
| **Release**         | `release.yml`       | Manual dispatch                            | Bumps `package.json`, creates Git tag and GitHub Release                      |

The **Production Gate** and **Security Scan** run on every push to `main`. Both must pass before cutting a release tag.

## Design System

### CSS Variables

All design tokens live in `app/globals.css` under the `@theme` block. Always use CSS variables — never raw values outside of design-token definitions.

```css
/* ✅ Correct */
background-color: var(--color-surface-1);
color: var(--color-success);

/* ❌ Avoid */
background-color: rgba(15, 23, 42, 0.8);
color: #22c55e;
```

### Surface Tokens

| Token               | Role                            |
| ------------------- | ------------------------------- |
| `--color-surface-0` | Page background (deepest layer) |
| `--color-surface-1` | Card / panel layer              |
| `--color-surface-2` | Raised panel / popover          |
| `--color-surface-3` | Modal / overlay                 |

### Status Color Semantics

Use semantic status tokens instead of Tailwind atomic colours:

| Meaning | Foreground        | Background              |
| ------- | ----------------- | ----------------------- |
| Success | `--color-success` | `--color-success-muted` |
| Warning | `--color-warning` | `--color-warning-muted` |
| Error   | `--color-error`   | `--color-error-muted`   |
| Info    | `--color-info`    | `--color-info-muted`    |

```tsx
// ✅ Semantic tokens
<Badge className="bg-[var(--color-success-muted)] text-[var(--color-success)]">Active</Badge>

// ❌ Raw Tailwind atomic
<Badge className="bg-green-500/20 text-green-400">Active</Badge>
```

### Border-Radius Scale

| Element                  | Class          |
| ------------------------ | -------------- |
| Cards, dialogs, modals   | `rounded-xl`   |
| Buttons, inputs, selects | `rounded-lg`   |
| Badges, tags, chips      | `rounded-md`   |
| Avatars                  | `rounded-full` |

### JS-Accessible Design Tokens

For values required in JavaScript (chart colours, inline styles, animation spring configs), import from `lib/design-tokens.ts`:

```ts
import { statusColors, surfaces, borderRadius } from "@/lib/design-tokens";

const color = statusColors.success; // "#22c55e"
const bg = surfaces[1]; // "rgba(15, 23, 42, 0.8)"
const radius = borderRadius.card; // "0.75rem"
```

Extend `lib/design-tokens.ts` when new JS-accessible tokens are needed — do not hardcode values in component files.

## i18n Conventions

All user-visible strings must be internationalised. The three locale files must stay in sync:

```
messages/en.json   ← source of truth (English)
messages/pt.json   ← Portuguese
messages/es.json   ← Spanish
```

**Adding a new key:**

1. Add the key to **all three** files simultaneously
2. Use nested namespaces matching the component domain: `dashboard.portfolioOverview`, `forms.addTenant`
3. Use named parameters for dynamic content: `"leaseExpiresSoon": "Lease expires in {days} days"`
4. Run `npx tsc --noEmit` to verify all `useTranslations()` calls resolve

**Wiring in a component:**

```tsx
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("dashboard");
  return <h1>{t("portfolioOverview")}</h1>;
}
```

## Local Development

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

```bash
npm install
cp .env.example .env   # fill in required variables
npx prisma generate
npm run dev
```

Open http://localhost:3000

### Commands

```bash
npm run dev             # Development server with hot reload
npm test                # Unit tests (Vitest)
npm run test:coverage   # Unit tests with coverage report
npm run test:watch      # Tests in watch mode
npm run test:e2e        # E2E tests (Playwright)
npm run lint            # ESLint
npm run type-check      # TypeScript check
npm run build           # Production build
```

### Database (Development)

Development uses SQLite by default (set in `.env`):

```bash
npx prisma generate      # Regenerate client after schema changes
npx prisma db push       # Apply schema without creating a migration
npx prisma studio        # Visual database browser
npx prisma migrate dev   # Create a named migration
```

### Release Process

Releases are automated via GitHub Actions:

1. **Actions** → **Release** → **Run workflow**
2. Select bump type: `patch`, `minor`, or `major`
3. Add optional release notes
4. The workflow bumps `package.json`, tags the commit, creates a GitHub Release, and triggers the Docker build/push to GHCR

## Branch Protection Rules (Admins)

Recommended settings under **Settings → Branches → `main`**:

- **Require a pull request before merging** (1 review for teams, 0 for solo)
- **Require status checks to pass**: `Lint & Type Check`, `Unit Tests with Coverage`, `Production Build`
- **Require branches to be up to date before merging**
- **Require conversation resolution before merging**
- **Do not allow bypassing the above settings**
- **Automatically delete head branches** — already enabled in this repo

---

Thanks for contributing — open an issue or a PR if you need help with the process.

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

| Stage             | Description          | Timeout |
| ----------------- | -------------------- | ------- |
| Lint & Type Check | ESLint + TypeScript  | 5 min   |
| Unit Tests        | Vitest with coverage | 10 min  |
| Build Validation  | Docker build test    | 15 min  |

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
