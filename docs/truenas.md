# TrueNAS SCALE Deployment Guide

Situs runs on TrueNAS SCALE as a **Custom App** (Docker). This is the only supported deployment
path.

> **No Kubernetes or Helm.** TrueNAS SCALE replaced its Kubernetes app engine with Docker in
> Electric Eel (24.10). The Helm chart and `k8s/` manifests this repo used to carry have been
> removed rather than left to rot — they could not run on a current TrueNAS and misled anyone
> reading them. If you are on 24.04 or earlier, use an older tag of this repository.

## Quick install

1. **Apps → Discover Apps → Custom App**
2. Image: `ghcr.io/jigle/situs:latest` (pin a version tag in production — see [Which tag](#which-tag))
3. Port: container `3000` → whichever host port you want
4. Storage: mount a host path at **`/app/data`**
5. Add the environment variables below
6. Install

The container initialises its own database on first start — `prestart` runs `prisma db push` when
the SQLite file has no tables, and adds any missing columns on every subsequent start. No init job,
no manual step.

## Which tag

Three names, written by different things. Picking the wrong one is the most common way to end up
running code you did not expect.

| Tag                  | Written by                         | Use it for               |
| -------------------- | ---------------------------------- | ------------------------ |
| `:latest`, `:1.25.0` | a release tag push only            | production               |
| `:main`              | every merge to `main`              | testing the newest code  |
| `:sha-<short>`       | every merge, and manual dispatches | pinning one exact commit |

**Only a release can claim `:latest` or a bare version number.** A build from `main` or a manual
dispatch is never allowed to, which is what stops a test image quietly becoming production.

**An image exists only if a workflow ran.** Naming a tag here does not build it — if the tag was
never published, the pull fails and TrueNAS keeps serving whatever it already had, which looks
exactly like a deploy that did nothing. Check `Actions → Deploy to GHCR` if in doubt, and
`https://<your-host>/api/info` to see the version and commit baked into the image that is
actually running.

> **Set the image pull policy to `Always` if you use `:main`.** It is a moving pointer, so with
> `IfNotPresent` the node keeps serving the cached layer and the tag appears frozen. Pinning
> `:sha-<short>` avoids the question entirely, because the name changes on every deploy.

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

## Connecting a bank (optional)

Without credentials the app imports movements from a CSV you export from your bank, and Settings
› Integrations shows no connect button — deliberately, since a button that can only fail is worse
than none. To connect a bank directly instead:

1. Create free credentials at <https://bankaccountdata.gocardless.com/user-secrets/>. GoCardless
   holds the AISP licence, so this instance needs none of its own.
2. Register `https://<your-host>/api/bank/connections/callback` as a redirect URI with them. It
   must match `NEXTAUTH_URL` exactly, or the bank refuses to return the user.
3. Set `GOCARDLESS_SECRET_ID` and `GOCARDLESS_SECRET_KEY`, then restart.
4. Settings › Integrations → **Connect a bank**. You are sent to your own bank to authorise
   read-only access; Situs never sees your banking password.

Reads are capped at roughly **4 per account per day** on the free tier, and the provider answers
429 for the rest of the day once that is passed. The app enforces the budget itself and shows
what is left, so "Sync now" refuses rather than burning the allowance.

For the daily automatic sync, set `CRON_SECRET` and point a scheduler at the endpoint once a day:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-host>/api/cron/bank-sync
```

The same secret gates `/api/cron/notifications` and `/api/cron/data-retention`; all three return
503 while it is unset, so nothing runs on a schedule until you set it.

Consents expire — 90 days by default, and a bank can revoke one sooner. When that happens the
connection is marked expired, syncing stops rather than quietly returning nothing, and both
Settings › Integrations and `/admin` say so with a **Reconnect** action.

To verify the flow before pointing it at a real bank, connect to `SANDBOXFINANCE_SFIN0000` from
the picker: it is a real API call against test data, not a mock.

## Google OAuth

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), add an
authorised redirect URI:

```
https://<your-domain>/api/auth/callback/google
```

It must match `NEXTAUTH_URL` exactly. When changing domains, add the new URI **before** cutting
over and remove the old one afterwards — otherwise sign-in fails with `redirect_uri_mismatch`.

## Publishing an image

Nothing reaches GHCR just because code landed on `main`. Two paths put an image there:

**A release (what production should run).** Actions → **Release** → Run workflow → pick
`patch`/`minor`/`major`. That opens a `release/vX.Y.Z` PR with the version bumps; merging it to
`main` makes the workflow create the tag and the GitHub Release, and the tag push is what triggers
**Deploy to GHCR**. So it is dispatch → merge → wait, not one button.

**A merge to `main` (the development channel).** Every merge builds automatically and publishes
`:main` and `:sha-<short>`. Nothing to dispatch — this is the normal way to test merged code.

**A one-off build (for a branch that has not been merged).** Actions → **Deploy to GHCR** → Run
workflow, choosing the branch and optionally a `version` string containing a hyphen, e.g.
`1.25.0-rc1`. A bare number like `1.25.0` is refused and falls back to `sha-<short>`, because bare
version numbers belong to releases. `dry_run: true` proves the image builds without publishing.

> This warning used to read "a one-off build still writes `:latest`". **That is no longer true**
> and was left here after the workflow was hardened. Only a tag push can write `:latest` or a bare
> version now — see [Which tag](#which-tag) — so testing a branch cannot move production. The
> stale warning is called out rather than quietly deleted because it discouraged using the
> dispatch path at all, which is the safe one.

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

**App reports healthy, sign-in works, every data route 500s — and the mounted dataset is empty.**
The database was never created, because the host directory is not writable by the container. The
container runs as uid/gid **1001:1001**; a freshly created dataset is typically owned by root with
mode 755, which gives 1001 read and execute but not write. From the TrueNAS shell:

```bash
sudo ls -lan /mnt/<pool>/<your-dataset>      # owner 0 0 = this is the problem
sudo chown -R 1001:1001 /mnt/<pool>/<your-dataset>
sudo chmod -R 770 /mnt/<pool>/<your-dataset>
```

Then restart. Note that after the `chown` your own shell user can no longer list the directory
without `sudo` — that is the change working, not a new fault.

Sign-in keeps working throughout because NextAuth uses JWT sessions and never reads the database,
which makes this look like a partial outage rather than a missing database. Images built after
2026-08-14 refuse to start in this state and print the `chown` above; older ones start anyway and
serve 500s. `PRESTART_FAIL_ON_SQLITE=false` restores the old behaviour if you need the app up
while you sort the mount out.

**Saving anything fails with a foreign-key or "record not found" error, right after the database
was first created.** The wording varies by screen — Prisma's `P2003` on `UserSettings.userId`, or
`P2025` on `User` — but they mean the same thing: the session names a user record that does not
exist.

**Sign out and sign in again.** That is the whole fix.

The cause is the order things happened in. Sessions are JWTs and the id inside one is written
once, at sign-in. If you signed in while `/app/data` was unwritable — before the `chown` above —
there was no database to provision the account into, so the token was issued carrying Google's
account id instead of a real `User.id`. The database exists now, but the token still points at
something that was never in it, and nothing re-resolves it for the session's 24-hour life.

Images built after 2026-08-14 close both halves of this: sign-in fails outright rather than
handing out a session that cannot write, and an existing token that names no user is repaired
from its email address on the next request. On those images the situation clears itself. **`/admin`**
reports it either way, under **Signed-in account**.

**Sign-in works but every data route returns 500 "Internal server error".** Different problem: the
tables exist (NextAuth is reading them) and it is the application models that fail. Almost always
schema drift — the image expects a column the database does not have, and one missing column takes
down every query for that model, so unrelated pages break together.

Open **`/admin`** first. It runs outside the normal data loading precisely so it still works when
this happens, and it names the missing columns with the command that fixes them. If the deployed
image is too old to have that page, the container log carries the same information:

```
The column `main.<table>.<column>` does not exist in the current database
```

The fix is a restart with `AUTO_DB_SCHEMA_SYNC` at its default (`true`), which applies additive
changes on start. If it is set to `false`, that is the cause.

A second, rarer cause looks identical from the browser: `PII_ENCRYPTION_KEY` was changed on an
instance that already had encrypted rows. That only breaks models with protected fields — tenants,
owners, payment methods, rent receipts, NRUA registrations — so if properties and buildings load
fine and those do not, suspect the key rather than the schema. Affected fields now read
`[ENCRYPTED]` instead of failing the request, and the reason is logged. Recover with
`node scripts/backfill-pii-encryption.js`, or restore the original key.

**Sign-in redirects in a loop or fails after a domain change.** `NEXTAUTH_URL` does not match the
URL in the browser, or the Google redirect URI was not updated.

**Rate limiting seems ineffective, or legitimate traffic gets 429s.** `TRUSTED_PROXY_COUNT` does
not match your actual proxy depth.

See [troubleshooting.md](troubleshooting.md) for issues not specific to TrueNAS.

## Removing

Apps → select the app → **Delete**. The dataset at `/app/data` survives unless you delete it
separately — which is also your backup, so take a snapshot before removing anything.
