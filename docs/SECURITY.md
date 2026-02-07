# Security Guide

This document covers security best practices for deploying and operating ProMan.

## Webhook HMAC Enforcement

ProMan supports two authentication methods for the update webhook (`/api/updates`):

1. **HMAC (`X-Hub-Signature-256`)** — recommended and default
2. **Bearer token (`Authorization: Bearer <secret>`)** — legacy fallback

### Recommended: HMAC-only mode

Set `UPDATE_WEBHOOK_HMAC_ONLY=true` in your deployment environment to reject Bearer tokens and require HMAC signatures on all webhook requests:

```bash
UPDATE_WEBHOOK_HMAC_ONLY=true
UPDATE_WEBHOOK_SECRET=<your-strong-secret>
```

If you still need Bearer fallback during migration, explicitly set:

```bash
ALLOW_BEARER_FALLBACK=true   # opt-in, not recommended for production
```

### How HMAC verification works

1. The sender computes `HMAC-SHA256(payload, secret)` and sends it as `X-Hub-Signature-256: sha256=<hex>`.
2. The server recomputes the HMAC using the stored `UPDATE_WEBHOOK_SECRET` and compares.
3. If they match, the request is authenticated.

## Init Endpoint Hardening (`/api/debug/db/init`)

This endpoint runs `prisma db push` and `prisma generate` — it **must** be protected in production.

### Production requirements

When `NODE_ENV=production`, the endpoint requires one of:

| Method | Header | Example |
|--------|--------|---------|
| Bearer | `Authorization: Bearer <INIT_SECRET>` | `curl -H "Authorization: Bearer $INIT_SECRET" -X POST .../api/debug/db/init` |
| HMAC | `X-Signature: <hmac-sha256-hex>` | See README for computation |

**Generate a strong secret:**

```bash
openssl rand -hex 32
```

### Deployment checklist

- [ ] `INIT_SECRET` is set as a Kubernetes Secret (not plaintext in values.yaml)
- [ ] `NODE_ENV=production` is set
- [ ] The endpoint is not exposed to the public internet (use internal service or VPN)
- [ ] After initial setup, consider disabling the endpoint entirely

## Secrets Management in CI/CD

### Do NOT echo secrets

```yaml
# BAD — leaks secret in logs
- run: echo "Secret is ${{ secrets.MY_SECRET }}"

# GOOD — use secrets only in env vars, never echo
- run: curl -H "Authorization: Bearer $MY_SECRET" https://example.com/api
  env:
    MY_SECRET: ${{ secrets.MY_SECRET }}
```

### Kubernetes Secrets (preferred)

```bash
# Create a k8s secret
kubectl create secret generic proman-secrets \
  --from-literal=INIT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  --from-literal=DATABASE_URL="file:/data/proman.sqlite" \
  -n <namespace>
```

Reference in deployment:

```yaml
env:
  - name: INIT_SECRET
    valueFrom:
      secretKeyRef:
        name: proman-secrets
        key: INIT_SECRET
```

### GitHub Actions secrets

- Store secrets in **Settings → Secrets and variables → Actions**
- Use `${{ secrets.SECRET_NAME }}` in workflows
- GitHub automatically masks secret values in logs
- Never use `echo` or `cat` on files containing secrets

## Rate Limiting

The webhook endpoint supports configurable rate limiting:

| Variable | Default | Description |
|----------|---------|-------------|
| `UPDATE_WEBHOOK_RATE_LIMIT` | `60` | Max requests per window |
| `UPDATE_WEBHOOK_RATE_WINDOW_MS` | `60000` | Window duration in ms |

## Security Headers

Ensure your reverse proxy or ingress adds these headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately via GitHub Security Advisories or email the maintainers directly. Do not open public issues for security vulnerabilities.
