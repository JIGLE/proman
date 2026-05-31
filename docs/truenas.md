# TrueNAS SCALE Deployment Guide

This guide covers deploying ProMan on TrueNAS SCALE.

## Quick Install

1. In TrueNAS Apps UI, select **Custom App** (or install from a catalog).
2. Set the container image: `ghcr.io/jigle/proman:<version>`.
3. Fill in **Application URL** and **Storage Path** (see below).
4. Click **Install** — secrets and database are set up automatically.

## Required Settings

You only need to configure **two things**:

| Setting             | Example                              | Notes                             |
| ------------------- | ------------------------------------ | --------------------------------- |
| **Application URL** | `http://192.168.1.50:30080`          | The URL you access the app at     |
| **Storage Path**    | `/mnt/pools/mypool/apps/proman/data` | TrueNAS dataset for the SQLite DB |

Everything else has sensible defaults:

- **NEXTAUTH_SECRET** and **INIT_SECRET** are auto-generated on first install
  and stored in a Kubernetes Secret. They persist across upgrades.
- **DATABASE_URL** defaults to `file:/app/data/proman.db`.
- **NODE_ENV**, **PORT**, and **HOSTNAME** are baked into the container image.

## Helm Installation

```bash
# 1. Edit the two required values
vim helm/proman/values-truenas.yaml

# 2. Install
helm install proman helm/proman -f helm/proman/values-truenas.yaml
```

The values file is intentionally minimal:

```yaml
app:
  nextauthUrl: "http://192.168.1.50:30080"

persistence:
  hostPath: /mnt/pools/mypool/apps/proman/data
```

### Overriding auto-generated secrets

If you need to provide your own secrets (e.g. migrating from another install):

```yaml
app:
  nextauthUrl: "http://192.168.1.50:30080"
  nextauthSecret: "your-existing-secret-here"
  initSecret: "your-existing-init-secret"
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

On first deploy the database schema is created **automatically** by an init
container that runs `prisma db push` before the app starts. No manual steps
are needed.

If automatic initialization fails, you can initialize manually:

### Option A: Use the init API endpoint

The auto-generated `INIT_SECRET` is stored in the Kubernetes Secret
`proman-secrets`. Retrieve it with:

```bash
kubectl get secret proman-secrets -n ix-proman \
  -o jsonpath='{.data.INIT_SECRET}' | base64 -d
```

Then call the init endpoint:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer <INIT_SECRET>" \
  http://<TRUENAS_IP>:30080/api/debug/db/init | jq
```

### Option B: Exec into the container

```bash
kubectl get pods -n ix-proman
kubectl exec -it <pod-name> -n ix-proman -- npx prisma db push --schema=prisma/schema.prisma
```

## Updating the App

1. Check for new releases at https://github.com/JIGLE/proman/releases
2. Update the image tag in TrueNAS App settings or Helm values
3. Restart the app — the init container will run any pending schema migrations
4. Verify: `curl http://<TRUENAS_IP>:30080/version.json`

## Optional Environment Variables

Add these via the **Extra Environment Variables** section in the TrueNAS UI
or in the `env:` list in your values file:

| Variable               | Notes                                   |
| ---------------------- | --------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Enables Google sign-in (see below)      |
| `GOOGLE_CLIENT_SECRET` | Required if `GOOGLE_CLIENT_ID` is set   |
| `SENDGRID_API_KEY`     | Enables email delivery via SendGrid     |
| `ENABLE_STRIPE`        | Set to `true` to enable Stripe payments |

## TrueNAS App Info Panel

To show Version, Source, and Logo in the TrueNAS UI:

1. Ensure `Chart.yaml` has `version`, `appVersion`, `home`, `sources`, and `icon`
2. Repackage: `bash scripts/helm-package.sh`
3. Upload the `.tgz` to your TrueNAS catalog or use it as a Custom App chart

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for common issues.

### TrueNAS-specific issues

**All API routes return 500 "Authentication failed":**

The database exists but has no tables. The init container should handle this
automatically, but if it failed:

1. Check pod logs: `kubectl logs -l app=proman -n ix-proman --tail=100`
2. Initialize the database manually (see [Database Initialization](#database-initialization)).
3. Verify the data directory is writable by UID 1001:
   ```bash
   kubectl exec -it <pod> -n ix-proman -- ls -la /app/data
   ```

**App shows "Deploying" indefinitely:**

- Check init container logs — the `prisma-init` init container may have failed:
  ```bash
  kubectl logs <pod-name> -c prisma-init -n ix-proman
  ```
- Verify the dataset path is correct and writable
- Check main container logs: `kubectl logs -l app=proman -n ix-proman --tail=100`

**Cannot access the app after install:**

- Check NodePort: `kubectl get svc -n ix-proman`
- Try port-forward: `kubectl port-forward svc/proman 3000:80 -n ix-proman`

**Permission denied / SQLite not writable:**

- Ensure the TrueNAS dataset permissions are set to UID `1001`, GID `1001`.
- Verify: `kubectl exec -it <pod> -- stat /app/data/proman.db`

## Google OAuth Setup

To enable Google sign-in:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Set **Authorized JavaScript origins**: `https://proman.example.com`
4. Set **Authorized redirect URIs**: `https://proman.example.com/api/auth/callback/google`
5. Copy the Client ID and Client Secret
6. Add as extra environment variables in TrueNAS app configuration:
   - `GOOGLE_CLIENT_ID` = `<your-client-id>.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET` = `<your-client-secret>`
7. Restart the app — the Google sign-in button will appear on the login page

> **Note:** `app.nextauthUrl` must exactly match the origin you configured in
> Google Cloud Console (including `https://` and port if non-standard).

## Removing the App

```bash
# Via Helm
helm uninstall proman -n ix-proman

# Or via TrueNAS Apps UI → select app → Delete
```

The persistent dataset is **not** deleted automatically. Remove manually if desired.
