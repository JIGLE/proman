# TrueNAS SCALE Deployment Guide

Situs runs on TrueNAS SCALE as a **Custom App** (Docker). This is the only supported deployment
path.

> **No Kubernetes or Helm.** TrueNAS SCALE replaced its Kubernetes app engine with Docker in
> Electric Eel (24.10). The Helm chart and `k8s/` manifests this repo used to carry have been
> removed rather than left to rot — they could not run on a current TrueNAS and misled anyone
> reading them. If you are on 24.04 or earlier, use an older tag of this repository.

## Quick install

1. **Apps → Discover Apps → Custom App**
2. Image: `ghcr.io/jigle/situs:latest` (pin a version tag in production)
3. Port: container `3000` → whichever host port you want
4. Storage: mount a host path at **`/app/data`**
5. Add the environment variables below
6. Install

The container initialises its own database on first start — `prestart` runs `prisma db push` when
the SQLite file has no tables, and adds any missing columns on every subsequent start. No init job,
no manual step.

## Storage

Create a dataset (for example `apps/situs/data`) and mount it at `/app/data`.

Set ownership to uid/gid **1001:1001** — the container drops to a non-root `nextjs` user, and it
cannot write to a dataset owned by anyone else. A container that starts and then fails on the first
write is almost always this.

## Environment variables

### Required

| Variable             | Example                       | Notes                                                                        |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `NEXTAUTH_URL`       | `https://situs.example.com`   | Full external URL, no trailing slash. Must match how users reach the app.    |
| `NEXTAUTH_SECRET`    | `openssl rand -base64 32`     | Minimum 32 characters. Signs sessions and tenant portal tokens.              |
| `DATABASE_URL`       | `file:/app/data/situs.sqlite` | Path **inside** the container, on the mounted dataset.                       |
| `PII_ENCRYPTION_KEY` | `openssl rand -hex 32`        | Exactly 64 hex chars. **The app refuses to start in production without it.** |

`PII_ENCRYPTION_KEY` encrypts IBAN, tax ID (NIF) and phone at rest. Without it those fields were
previously written in plaintext with no warning, which is why the app now exits instead. To run
without encryption anyway — a throwaway staging box — set `ALLOW_UNENCRYPTED_PII=true` and accept
a loud warning on every start.

If you set the key on a deployment that already has data, run
`node scripts/backfill-pii-encryption.js` to encrypt the rows written before it existed.

### Recommended

| Variable              | Default | Notes                                                                        |
| --------------------- | ------- | ---------------------------------------------------------------------------- |
| `TRUSTED_PROXY_COUNT` | `1`     | Number of proxies in front (Cloudflare tunnel / reverse proxy counts as one) |

This decides which `X-Forwarded-For` entry the rate limiter trusts. Leave it at `1` behind a single
tunnel or reverse proxy. Set it to `0` only if the container is reachable directly, in which case
the header is ignored entirely. Getting it wrong lets a caller pick their own rate-limit bucket.

### Optional

| Variable                                    | Notes                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `ENABLE_DEMO_LOGIN`                         | `true` enables demo credentials that grant **ADMIN**. Leave unset in production. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables Google sign-in — see below                                               |
| `SENDGRID_API_KEY`                          | Email delivery                                                                   |
| `STRIPE_SECRET_KEY`, `ENABLE_STRIPE`        | Card / SEPA payments                                                             |
| `AUTO_DB_INIT`, `AUTO_DB_SCHEMA_SYNC`       | Both default `true`; set `false` to manage schema yourself                       |

> `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` no longer exists. The sign-in form now resolves demo
> availability from `ENABLE_DEMO_LOGIN` on the server per request, so one variable controls both
> the form and the provider. Remove it if it is still set.

## Google OAuth

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), add an
authorised redirect URI:

```
https://<your-domain>/api/auth/callback/google
```

It must match `NEXTAUTH_URL` exactly. When changing domains, add the new URI **before** cutting
over and remove the old one afterwards — otherwise sign-in fails with `redirect_uri_mismatch`.

## Updating

1. Check <https://github.com/JIGLE/situs/releases>
2. Change the image tag in the app's settings
3. Redeploy — the container applies any additive schema changes on start
4. Verify: `curl https://<your-domain>/version.json`

TrueNAS does not detect updates for a Custom App; there is no catalog metadata to compare against.
Either check releases manually or run a container auto-updater alongside it.

## Troubleshooting

**Container starts then exits immediately.** Check the logs for the `PII_ENCRYPTION_KEY` message —
a missing key is a deliberate hard stop, not a crash.

**All API routes return 500 "Authentication failed".** The database has no tables. Confirm the
`/app/data` mount is writable by 1001:1001, then restart so `prestart` can run, or initialise
manually:

```bash
# From the TrueNAS shell, against the running container
docker exec -it <container> npx prisma db push --schema=prisma/schema.prisma
```

**Sign-in redirects in a loop or fails after a domain change.** `NEXTAUTH_URL` does not match the
URL in the browser, or the Google redirect URI was not updated.

**Rate limiting seems ineffective, or legitimate traffic gets 429s.** `TRUSTED_PROXY_COUNT` does
not match your actual proxy depth.

See [troubleshooting.md](troubleshooting.md) for issues not specific to TrueNAS.

## Removing

Apps → select the app → **Delete**. The dataset at `/app/data` survives unless you delete it
separately — which is also your backup, so take a snapshot before removing anything.
