Tests README

This file explains the test modes and how to run tests locally.

Modes
- Mock mode (default): No DATABASE_URL set. Uses an in-memory Prisma mock so tests are fast and hermetic.
- Sqlite mode: Set `DATABASE_URL=file:./ci-test.db` and run `npx prisma db push` to create a local sqlite DB that tests will use.

Running tests
- Mock mode (default):
  - npm ci
  - npm test

- Sqlite mode (Windows cmd example):
  - cmd /C "set DATABASE_URL=file:./ci-test.db&& npx prisma db push --accept-data-loss --schema prisma/schema.prisma && npm test"

Notes
- Use `tests/helpers/render-with-providers.tsx` by importing `renderWithProviders` in tests that require Intl and Currency contexts.
- Local CI DB `ci-test.db` is ignored by `.gitignore` (do not commit).
