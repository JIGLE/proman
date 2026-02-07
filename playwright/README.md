# Playwright E2E Tests

This directory contains configuration and fixtures for Playwright end-to-end tests. Test files live in `../e2e/`.

## Prerequisites

```bash
# Install Playwright browsers (one time)
npx playwright install --with-deps chromium
```

## Running E2E Tests Locally

```bash
# Start dev server + run all tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run a specific test file
npx playwright test e2e/dashboard.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run only Chromium
npx playwright test --project=chromium
```

## Test Configuration

The Playwright config is at `../playwright.config.ts`. Key settings:

| Setting | Local | CI |
|---------|-------|----|
| Retries | 0 | 2 |
| Workers | auto | 1 |
| Trace | on-first-retry | on-first-retry |
| Screenshots | on-failure | on-failure |

## Writing Tests

- Place test files in `../e2e/` with `.spec.ts` extension.
- Use `auth.setup.ts` for shared authentication setup.
- Keep tests isolated: each test should set up its own data.
- Use `test.describe` to group related tests.

## Test Reports

After running, view the HTML report:

```bash
npx playwright show-report
```

Reports are saved to `../playwright-report/`.

## Debugging

```bash
# Run with inspector
npx playwright test --debug

# Run with trace viewer
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## CI Behavior

E2E tests do **not** run on every push. To trigger them:
1. Manually dispatch the CI workflow with `run_e2e=true`, or
2. Add the `run-e2e` label to a Pull Request.
