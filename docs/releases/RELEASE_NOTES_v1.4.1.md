# v1.4.1 - Post-v1.4.0 Stabilization

Date: 2026-03-11
Type: Stabilization release
Base: v1.4.0

This release consolidates sprint execution work focused on quality gates, security hardening, auditability, and documentation claim alignment.

## Highlights

- CI quality gate hardened
  - ESLint warnings now fail CI (`--max-warnings=0`)
  - Added required Playwright PR smoke checks on pull requests to `main`

- Security hardening
  - Added constant-time secret comparison utility
  - Migrated cron auth token validation to timing-safe comparison

- GDPR auditability improvements
  - `/api/admin/database` now emits `DATABASE_ACCESS` audit events
  - Captures actor, table scope, request path/query/method, and client metadata
  - Keeps endpoint resilient when audit persistence fails

- Lint and type debt reduction
  - Reduced warning backlog to zero and introduced non-regression ratchet
  - Type-check and lint remain green under stricter policy

- Test signal quality improvements
  - Normalized expected error/log output in noisy suites
  - Improved reliability and readability of test output

- Documentation governance and claim alignment
  - Active sprint board established as source of truth
  - Historical status docs marked non-authoritative
  - Public capability wording aligned with actual implementation state
  - Added claim-audit report

## Validation Snapshot

- `npm run verify:ci` green
- Test baseline: 37 files, 86 passing, 6 skipped

## Notable Files

- CI and gating:
  - `.github/workflows/ci.yml`
  - `package.json`

- Security and API:
  - `lib/utils/security.ts`
  - `app/api/cron/notifications/route.ts`
  - `app/api/admin/database/route.ts`
  - `app/api/admin/database/route.test.ts`

- Documentation:
  - `RELEASES.md`
  - `docs/SPRINT_BOARD_2026Q2.md`
  - `docs/CLAIM_AUDIT_2026-03-11.md`
  - `docs/PROJECT_STATUS.md`

## Notes

- This is a stabilization increment from `v1.4.0`.
- Feature surface remains focused on reliability, correctness, and operational confidence.
