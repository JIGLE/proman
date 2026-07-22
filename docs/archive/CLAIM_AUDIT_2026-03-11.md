# Claim Audit Report - 2026-03-11

Scope: public-facing and active planning docs in repository root and docs index paths.

Authoritative planning source:

- [SPRINT_BOARD_2026Q2.md](SPRINT_BOARD_2026Q2.md)

## Summary

- Reviewed high-risk product/engineering claims for accuracy against implemented routes, services, and latest CI verification output.
- Corrected overstatements in [../README.md](../README.md) and stale testing metrics in [../tests/README.md](../tests/README.md).
- Confirmed historical status documents are explicitly marked non-authoritative in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Corrections Applied

1. README capability language normalized

- File: [../README.md](../README.md)
- Updated:
  - "full Iberian tax and legal compliance built in" -> compliance-tooling wording
  - "Production-ready" -> "Production-ready baseline"
  - Portugal receipts claim -> AT-compatible XML payload generation wording
  - NRUA claim -> export workflow and tracking wording
  - Payment claim -> clarified configuration and external provider dependencies

2. README test baseline refreshed

- File: [../README.md](../README.md)
- Updated unit-test baseline from older counts to current CI baseline.

3. Testing guide metrics refreshed

- File: [../tests/README.md](../tests/README.md)
- Updated test file/test counts and metadata date/version.

## Verified Claims (kept)

1. Core compliance endpoints exist

- [../app/api/compliance/rent-receipts/route.ts](../app/api/compliance/rent-receipts/route.ts)
- [../app/api/compliance/nrua/route.ts](../app/api/compliance/nrua/route.ts)
- [../app/api/compliance/rent-cap/route.ts](../app/api/compliance/rent-cap/route.ts)

2. SAF-T PT export endpoints exist

- [../app/api/tax/saft-pt/route.ts](../app/api/tax/saft-pt/route.ts)
- [../app/api/tax/saft-pt/download/route.ts](../app/api/tax/saft-pt/download/route.ts)

3. Payment-method APIs and SEPA lifecycle routes exist

- [../app/api/payments/methods/route.ts](../app/api/payments/methods/route.ts)
- [../app/api/payments/sepa-mandates/route.ts](../app/api/payments/sepa-mandates/route.ts)

4. MB WAY/Bizum are placeholders requiring external integration

- [../lib/payment/methods/portugal.ts](../lib/payment/methods/portugal.ts)
- [../lib/payment/methods/spain.ts](../lib/payment/methods/spain.ts)

## Residual Notes

- Release-specific and archive/historical docs may contain point-in-time metrics by design.
- These are acceptable when scoped as historical snapshots and should not be used as current status references.
