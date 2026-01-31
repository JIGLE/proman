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
