PR: Improve update webhook security and reliability

Summary
- Adds HMAC (`X-Hub-Signature-256`) verification for incoming webhook POSTs to `/api/updates`.
- Adds minimal payload validation and atomic file writes for the JSON cache to prevent partial writes and race conditions.
- Keeps `Authorization: Bearer <secret>` as a fallback for compatibility.
- Adds unit tests for signature verification, fallback auth, and payload handling.

Why
- Prevent unauthorized updates to the release cache by verifying payload integrity.
- Reduce race-conditions and corrupt cache files by writing atomically.

Migration / infra steps
- Ensure `UPDATE_WEBHOOK_SECRET` is set in running instances (or CI secrets).
- Update CI/CD release workflow to optionally send `X-Hub-Signature-256` header computed as `sha256=<hex>` over the request body using the same secret; keeping Authorization header works for rollbacks.
- Verify `PERSISTENCE_MOUNT_PATH` points to a writable persistent volume for deployed containers.

Testing instructions
- Unit tests: `npm test` — new tests under `tests/api/updates.route.spec.ts`.
- Manual test (local): send a POST to `http://localhost:3000/api/updates` with a JSON body and header `X-Hub-Signature-256: sha256=<hex>` where `<hex>` is HMAC-SHA256 of the body using `UPDATE_WEBHOOK_SECRET`.

---

Release notes template (use with commit list)

Summary: Short, non-technical one-line summary for end-users.

Added:
- [list items]

Changed:
- [list items]

Fixed:
- [list items]

Security:
- [list items]

---

Changelog entry (X.Y.Z)

Version X.Y.Z — YYYY-MM-DD

- Key user-facing changes: Improved webhook security (signature verification) and more reliable cache writes.
- Upgrade notes: Set `UPDATE_WEBHOOK_SECRET` in deployment environment and update CI release workflow to send `X-Hub-Signature-256`.
- Breaking changes: None expected; legacy `Authorization: Bearer` is still accepted.

---

Automated commit message

Conventional commit (header):
```
fix(webhook): add HMAC verification and atomic cache writes
```

Body (2-3 sentences):
- Verify incoming update webhook requests using `X-Hub-Signature-256` HMAC and compute signature over the raw request body. Also write the release cache file atomically (temp file + rename) to avoid partial writes. Adds unit tests for signature and fallback flows.

---

Bug report template — "stale release info shown"

Title: stale release info shown

Steps to reproduce:
1. Deploy the app with a configured `PERSISTENCE_MOUNT_PATH`.
2. Trigger a release notification from CI/CD (POST to /api/updates) with a valid signature.
3. Observe the UI or API shows an older release.

Expected result: The latest release information is updated and visible.
Actual result: Older release remains.

Logs / relevant output:
- Paste server logs around the time of the webhook.

Environment:
- Node version: (fill)
- Deployment type: Docker / Kubernetes / Other
- `PERSISTENCE_MOUNT_PATH`: (fill)

Severity: (Low / Medium / High)

---

Security checklist for `app/api/updates/route.ts`

- Secret handling: PASS/FAIL — Ensure `UPDATE_WEBHOOK_SECRET` is read from env and not logged.
- Signature verification: PASS/FAIL — Verify `X-Hub-Signature-256` HMAC against raw body using constant-time comparison.
- Authorization fallback: NOTE — Bearer fallback allowed for compatibility; rotate secret and remove fallback when all senders use HMAC.
- File write safety: PASS/FAIL — Use atomic write (tmp file + rename) to prevent partial files.
- Path & permissions: PASS/FAIL — Ensure `PERSISTENCE_MOUNT_PATH` points to a writable directory with limited permissions.
- Input validation: PASS/FAIL — Validate that payload contains at least `tag_name`.
- DoS / rate limiting: NOTE — Endpoint publicly reachable; consider rate-limiting or IP allowlist if needed.
- HMAC-only rollout: set `UPDATE_WEBHOOK_HMAC_ONLY=true` in running instances to require HMAC signatures only (remove Bearer fallback).
- Rate limiting: basic in-process defaults are available via `UPDATE_WEBHOOK_RATE_LIMIT` and `UPDATE_WEBHOOK_RATE_WINDOW_MS`; prefer infra-level rate limiting in production.
- Logging: PASS/FAIL — Do not log secrets or full payloads; log only metadata and errors.

---

Prioritized remediation plan

1. Small — Implement HMAC verification and atomic writes (done in this PR). Next: deploy secrets and update CI.
2. Medium — Update CI workflow to compute and send signature header; run canary to verify.
3. Medium — Add rate-limiting or allowlist for webhook endpoint.
4. Large — Move cache to an object store (S3) or database if running on serverless platforms that lack writable volumes.
