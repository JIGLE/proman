# TrueNAS SCALE Deployment Guide

This guide covers deploying ProMan specifically on TrueNAS SCALE.

## Quick Install

1. In TrueNAS Apps UI, select **Custom App** (or install from a catalog if available).
2. Set the container image: `ghcr.io/jigle/proman:<version>` (use a fixed tag, not `latest`).
3. Configure environment variables (see below).
4. Mount a host path dataset for persistent storage at `/app/data`.
5. Set the network port (default: `30080` NodePort).

## Required Environment Variables

Set these in the TrueNAS Custom App UI or via Helm values:

| Variable              | Value                          | Notes                                   |
| --------------------- | ------------------------------ | --------------------------------------- |
| `DATABASE_URL`        | `file:/app/data/proman.db`     | Points to persistent volume             |
| `NEXTAUTH_URL`        | `https://proman.example.com`   | Must match the URL you access the app at (protocol + domain/IP + port) |
| `NEXTAUTH_SECRET`     | `<random-32-char-string>`      | Generate with `openssl rand -base64 32` |
| `NODE_ENV`            | `production`                   |                                         |
| `HOSTNAME`            | `0.0.0.0`                      | Bind to all interfaces                  |
| `PORT`                | `3000`                         | Internal container port                 |
| `INIT_SECRET`         | `<random-hex-string>`          | Protects DB init endpoint               |
| `GOOGLE_CLIENT_ID`    | *(from Google Cloud Console)*  | Optional — enables Google sign-in       |
| `GOOGLE_CLIENT_SECRET`| *(from Google Cloud Console)*  | Required if `GOOGLE_CLIENT_ID` is set   |

## Optional Environment Variables

| Variable                           | Default | Notes                                                                                                                                                                                   |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_STRIPE`                    | `false` | Enable Stripe payments                                                                                                                                                                  |
| `ENABLE_SENDGRID`                  | `false` | Enable email delivery                                                                                                                                                                   |
| `ENABLE_OAUTH`                     | `false` | Enable Google OAuth                                                                                                                                                                     |
| `SKIP_PRESTART`                    | `false` | Keep `false` (default) so the container auto-initializes the DB on first start                                                                                                          |
| `PRESTART_FAIL_ON_SQLITE`          | `false` | Keep false to allow operator remediation                                                                                                                                                |
| `RUN_PRISMA_DB_PUSH_AT_STARTUP`    | `false` | When `true`, run `npx prisma db push` and `npx prisma generate` on container start (not recommended for production). Prefer using the Helm init Job when `persistence.enabled` is true. |
| `NEXT_PUBLIC_DISABLE_AUTO_DB_INIT` | `false` | Set to `true` after initial DB setup to avoid rate limit errors                                                                                                                         |

## Helm Installation

Using the ProMan Helm chart:

```bash
helm install proman helm/proman -f helm/proman/values-truenas.yaml
```

Edit `helm/proman/values-truenas.yaml` before installing:

```yaml
image:
  tag: "1.1.0" # Use a specific release tag

env:
  - name: NEXTAUTH_URL
    value: "http://YOUR_TRUENAS_IP:30080"
  - name: NEXTAUTH_SECRET
    value: "your-secret-here" # Or use secretKeyRef

persistence:
  hostPath: /mnt/pools/YOUR_POOL/apps/proman/data
```

## Storage Setup

### Create dataset

In TrueNAS:

1. Go to **Storage → Pools → Your Pool**
2. Create dataset: `apps/proman/data`
3. Set permissions: user `1001`, group `1001` (matches container's `nextjs` user)

### Verify mount

```bash
kubectl exec -it <pod> -- ls -la /app/data
```

## Database Initialization

On first deploy the database schema is created **automatically** at startup
(the container runs `prisma db push` when it detects an empty database).
If automatic initialization is disabled (`AUTO_DB_INIT=false`), you can
initialize the database manually:

### Option A: Use the init API endpoint

Requires `INIT_SECRET` to be set in environment variables.

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $INIT_SECRET" \
  http://<TRUENAS_IP>:30080/api/debug/db/init | jq
```

Expected response:

```json
{
  "ok": true,
  "dbPath": "/app/data/proman.db",
  "pushOut": "...",
  "genOut": "..."
}
```

### Option B: Exec into the container

```bash
# Find the pod name
kubectl get pods -n ix-proman

# Run prisma db push
kubectl exec -it <pod-name> -n ix-proman -- npx prisma db push --schema=prisma/schema.prisma
```

### Option C: Helm init Job (automatic)

If `initJob.enabled: true` is set in your Helm values (default in
`values-truenas.yaml`), a Kubernetes Job runs `prisma db push` automatically
after `helm install` or `helm upgrade`.

Verify the job succeeded:

```bash
kubectl get jobs -n ix-proman
kubectl logs job/proman-prisma-init -n ix-proman
```

## Updating the App

1. Check for new releases at https://github.com/JIGLE/proman/releases
2. Update the image tag in TrueNAS App settings or Helm values
3. Restart the app
4. Verify: `curl http://<TRUENAS_IP>:30080/version.json`

## TrueNAS App Info Panel

To show Version, Source, and Logo in the TrueNAS UI:

1. Ensure `Chart.yaml` has `version`, `appVersion`, `home`, `sources`, and `icon`
2. Repackage: `bash scripts/helm-package.sh`
3. Upload the `.tgz` to your TrueNAS catalog or use it as a Custom App chart

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for common issues.

### TrueNAS-specific issues

**All API routes return 500 "Authentication failed":**

This is the most common issue on first deploy. It means the database file
exists but has no tables (the schema was never applied).

1. Check pod logs for `"no such table"` errors:
   ```bash
   kubectl logs -l app=proman -n ix-proman --tail=100
   ```
2. Initialize the database (see [Database Initialization](#database-initialization) above).
3. If using Helm, check if the init Job failed:
   ```bash
   kubectl get jobs -n ix-proman
   kubectl logs job/proman-prisma-init -n ix-proman
   ```
4. Verify the data directory is writable by UID 1001:
   ```bash
   kubectl exec -it <pod> -n ix-proman -- ls -la /app/data
   ```
   Expected: file owned by `nextjs` (UID 1001, GID 1001).

**App shows "Deploying" indefinitely:**

- The health check (`/api/health`) returns 503 when the database is not
  initialized. Kubernetes will never mark the pod as ready, causing a
  deploy loop. Fix by initializing the database.
- Check pod logs: `kubectl logs -l app=proman -n ix-proman --tail=100`
- Verify the dataset path is correct and writable

**Cannot access the app after install:**

- Check NodePort: `kubectl get svc -n ix-proman`
- Try port-forward: `kubectl port-forward svc/proman 3000:80 -n ix-proman`

**Permission denied / SQLite not writable:**

- Ensure the TrueNAS dataset permissions are set to UID `1001`, GID `1001`.
- In Helm values, set `podSecurityContext.fsGroup: 1001`.
- Verify: `kubectl exec -it <pod> -- stat /app/data/proman.db`

**Database errors after TrueNAS update:**

- Re-run database init (see above)
- Check dataset permissions haven't changed

## Google OAuth Setup

To enable Google sign-in:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Set **Authorized JavaScript origins**: `https://proman.example.com`
4. Set **Authorized redirect URIs**: `https://proman.example.com/api/auth/callback/google`
5. Copy the Client ID and Client Secret
6. Add these environment variables to your TrueNAS app configuration:
   ```
   GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```
7. Restart the app — the Google sign-in button will appear on the login page

> **Note:** `NEXTAUTH_URL` must exactly match the origin you configured in
> Google Cloud Console (including `https://` and port if non-standard).

## Removing the App

```bash
# Via Helm
helm uninstall proman -n ix-proman

# Or via TrueNAS Apps UI → select app → Delete
```

The persistent dataset is **not** deleted automatically. Remove manually if desired.
