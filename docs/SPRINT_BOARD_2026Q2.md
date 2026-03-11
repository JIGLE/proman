# ProMan Sprint Board - 2026 Q2

Status date: 2026-03-11
Owner: Product + Engineering

Progress update:

- Completed: C2 Timing-safe cron auth comparison (utility added and endpoint migrated).
- Completed: D1 Warning backlog reduction (lint warnings reduced from 134 to 0; type-check, lint, and tests green).
- Completed: D2 warning ratchet policy in CI (lint now enforces --max-warnings=0).
- Completed: E1 recurring act(...) test warning cleanup for current unit suite baseline.
- Completed: E2 expected test-error logging normalization in high-noise suites.
- Completed: A2 PR quality gate now includes required Playwright smoke tests on pull requests to main.
- Completed: C1 admin database access now writes GDPR audit events with actor, scope, and request metadata.
- Completed: B2 single source of planning truth (active board made authoritative; stale status docs marked historical).
- Completed: A1 TypeScript unblock by adding Vite dev dependency and regenerating lockfile.
- Completed: B1 public claim correction via full documentation claim-audit and wording alignment.

This is the execution board for the highest-risk issues verified on main. It is intentionally delivery-oriented with acceptance criteria and effort points.

## Epic A - Release Stability Baseline (P0)

Goal: Restore reliable CI signal and unblock merge confidence.

### Ticket A1 - Fix missing Vite type dependency

- Priority: P0
- Effort: 2 points
- Owner: Engineering
- Status: Completed on 2026-03-11
- Problem: TypeScript fails because vite/client types are referenced but Vite is not declared.
- Tasks:
  1. Add Vite to devDependencies.
  2. Regenerate lockfile.
  3. Validate type-check and verify:ci.
- Acceptance criteria:
  1. npm run type-check passes locally and in CI.
  2. npm run verify:ci completes with zero TypeScript errors.

### Ticket A2 - Enforce P0 quality gate visibility

- Priority: P0
- Effort: 3 points
- Owner: Engineering
- Status: Completed on 2026-03-11
- Problem: Core checks can pass while optional E2E does not run for most PRs.
- Tasks:
  1. Define critical E2E smoke subset.
  2. Require smoke E2E on protected branch PRs.
  3. Keep full E2E suite opt-in/nightly.
- Acceptance criteria:
  1. PRs to main cannot merge without critical-path browser checks.
  2. CI runtime impact remains under agreed threshold.

## Epic B - Product Truth in Public Docs (P0)

Goal: Ensure what users read matches what is implemented.

### Ticket B1 - Correct payment capability claims

- Priority: P0
- Effort: 2 points
- Owner: Product + Engineering
- Status: Completed on 2026-03-11
- Problem: Public docs imply MB WAY/Bizum are production-integrated although code paths are placeholders.
- Tasks:
  1. Update README feature wording.
  2. Align release and integration docs where needed.
- Acceptance criteria:
  1. No top-level doc claims MB WAY/Bizum are production-ready.
  2. Placeholder state is explicit and discoverable.

### Ticket B2 - Create single source of planning truth

- Priority: P0
- Effort: 3 points
- Owner: Product
- Status: Completed on 2026-03-11
- Problem: Existing status docs contain stale, contradictory progress statements.
- Tasks:
  1. Promote this board as active execution artifact.
  2. Mark stale status sections as historical.
  3. Add weekly review ritual.
- Acceptance criteria:
  1. Team references one active board for priorities and ownership.
  2. Historical docs are clearly labeled and non-authoritative.

## Epic C - Compliance and Security Hardening (P1)

Goal: Close known compliance and security gaps in admin and cron surfaces.

### Ticket C1 - Add admin data access audit logging

- Priority: P1
- Effort: 5 points
- Owner: Engineering
- Status: Completed on 2026-03-11
- Problem: Admin database browsing endpoint notes missing GDPR audit trail.
- Tasks:
  1. Persist audit event on endpoint access.
  2. Include actor, timestamp, scope, and request metadata.
  3. Add tests for success and failure paths.
- Acceptance criteria:
  1. Every admin data-read event is auditable.
  2. Audit writes do not leak sensitive payload values.

### Ticket C2 - Timing-safe cron auth comparison

- Priority: P1
- Effort: 3 points
- Owner: Engineering
- Problem: Current token equality can trigger timing-attack lint warning.
- Tasks:
  1. Implement constant-time token compare utility.
  2. Reuse utility in cron-protected endpoints.
  3. Add tests for positive and negative auth cases.
- Acceptance criteria:
  1. Auth logic passes security lint rule.
  2. Functional behavior remains unchanged.

## Epic D - Lint and Type Debt Reduction (P1)

Goal: Reduce warning noise so regressions are visible.

### Ticket D1 - Burn down warning backlog by category

- Priority: P1
- Effort: 8 points
- Owner: Engineering
- Status: Completed on 2026-03-11
- Problem: High warning volume (unused vars, explicit any, hooks deps, security).
- Tasks:
  1. Batch-fix no-unused-vars and autofixable findings.
  2. Resolve hook dependency warnings with explicit intent.
  3. Reduce explicit any in server and shared UI primitives.
- Acceptance criteria:
  1. Warning count reduced by at least 60%.
  2. No increase in warning count allowed on new PRs.

### Ticket D2 - Introduce warning ratchet policy

- Priority: P1
- Effort: 3 points
- Owner: Engineering
- Status: Completed on 2026-03-11
- Problem: Warning debt can silently regress.
- Tasks:
  1. Set warning budget threshold in CI.
  2. Lower threshold each sprint until near-zero.
- Acceptance criteria:
  1. CI fails if warning budget is exceeded.
  2. Budget target documented and versioned.

## Epic E - Test Signal Quality (P2)

Goal: Keep tests trustworthy and low-noise.

### Ticket E1 - Remove recurring act warnings

- Priority: P2
- Effort: 3 points
- Owner: QA + Engineering
- Status: Completed on 2026-03-11
- Problem: Repeated act warnings reduce confidence in test output.
- Tasks:
  1. Wrap state-changing test flows in act or await user events consistently.
  2. Update test helper patterns.
- Acceptance criteria:
  1. npm test output has no recurring act warnings.

### Ticket E2 - Normalize expected error logging

- Priority: P2
- Effort: 2 points
- Owner: QA + Engineering
- Status: Completed on 2026-03-11
- Problem: Expected error-boundary logs look like failures.
- Tasks:
  1. Route expected errors through controlled test logger.
  2. Keep unexpected errors visible.
- Acceptance criteria:
  1. Expected errors are clearly identified and do not obscure failures.

## Sprint Proposal (2-Week Cadence)

### Sprint 1 (Weeks 1-2)

- A1 Fix missing Vite type dependency
- B1 Correct payment capability claims
- B2 Single source of planning truth
- C2 Timing-safe cron auth comparison

### Sprint 2 (Weeks 3-4)

- A2 Enforce P0 E2E quality gate
- C1 Admin audit logging
- D1 Warning backlog reduction (phase 1)

### Sprint 3 (Weeks 5-6)

- D2 Warning ratchet policy
- E1 Remove act warnings
- E2 Normalize expected test logging

## Risk Register

- External partner dependency for MB WAY/Bizum can delay payment roadmap.
- CI duration may increase after E2E gating; requires smoke-scope design.
- Lint debt reduction may expose behavior edge cases in legacy components.

## Weekly Operating Rhythm

- Monday: Board grooming and ownership confirmation.
- Wednesday: Mid-sprint risk checkpoint.
- Friday: Demo, metrics review, and budget ratchet update.
