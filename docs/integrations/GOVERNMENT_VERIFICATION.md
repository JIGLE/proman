# Government Verification Scaffold

This document describes the provider-agnostic ownership verification scaffold added for future integrations such as Portal das Financas, cadastral data providers, and land-registry lookups.

## Goals

- Keep government identity and ownership workflows out of the core auth tables.
- Support more than one provider without rewriting the persistence model.
- Preserve a traceable audit trail for verification requests and ownership claims.
- Allow property ownership verification and property-data enrichment to evolve independently.

## Data Model

Two Prisma models now back this domain:

- `GovernmentVerification`
  - User-scoped verification request.
  - Tracks provider, scope, status, lifecycle timestamps, external reference, and metadata.
- `PropertyVerificationClaim`
  - Property-scoped claim attached to a verification request.
  - Tracks claim type, status, ownership percentage, and source matching fields.

This separation keeps provider session state and property matching state from collapsing into the `User`, `Owner`, or `PropertyOwner` models too early.

## API Surface

- `GET /api/ownership-verifications`
  - Returns verification requests for the authenticated user.
  - Supports optional filtering by `provider`, `scope`, `status`, and `propertyId`.
- `POST /api/ownership-verifications`
  - Creates a new verification request scaffold for the authenticated user.
  - Accepts optional property claims so a single verification can cover multiple properties.

Both endpoints emit audit entries so later provider integrations can inherit accountability requirements instead of bolting them on afterwards.

## Current Scope

This scaffold does not yet perform live OAuth or registry callbacks. It establishes the persistence and API seam needed for those provider-specific flows.

## Next Steps

- Add provider adapters for Financas and future land-registry or cadastral systems.
- Add callback or polling handlers that transition verification status from `pending` to terminal states.
- Attach verified ownership results to onboarding and compliance workflows.
- Add admin review tooling for failed or partial matches.
