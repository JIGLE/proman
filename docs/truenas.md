# TrueNAS SCALE Deployment Guide

This guide covers deploying ProMan specifically on TrueNAS SCALE.

## Quick Install

1. In TrueNAS Apps UI, select **Custom App** (or install from a catalog if available).
2. Set the container image: `ghcr.io/jigle/proman:<version>` (use a fixed tag, not `latest`).
3. Configure environment variables (see below).
4. Mount a host path dataset for persistent storage at `/data`.
5. Set the network port (default: `30080` NodePort).

## Required Environment Variables

Set these in the TrueNAS Custom App UI or via Helm values:

| Variable          | Value                       | Notes                                   |
| ----------------- | --------------------------- | --------------------------------------- |
| `DATABASE_URL`    | `file:/data/proman.sqlite`  | Points to persistent volume             |
| `NEXTAUTH_URL`    | `http://<TRUENAS_IP>:30080` | Must match external URL                 |
| `NEXTAUTH_SECRET` | `<random-32-char-string>`   | Generate with `openssl rand -base64 32` |
| `NODE_ENV`        | `production`                |                                         |
| `HOSTNAME`        | `0.0.0.0`                   | Bind to all interfaces                  |
| `PORT`            | `3000`                      | Internal container port                 |
| `INIT_SECRET`     | `<random-hex-string>`       | Protects DB init endpoint               |

## Optional Environment Variables

| Variable                           | Default | Notes                                                                                                                                                                                   |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_STRIPE`                    | `false` | Enable Stripe payments                                                                                                                                                                  |
| `ENABLE_SENDGRID`                  | `false` | Enable email delivery                                                                                                                                                                   |
| `ENABLE_OAUTH`                     | `false` | Enable Google OAuth                                                                                                                                                                     |
| `SKIP_PRESTART`                    | `true`  | Recommended for TrueNAS (platform-managed lifecycle)                                                                                                                                    |
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
kubectl exec -it <pod> -- ls -la /data
```

## Database Initialization

After first install, initialize the database schema:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $INIT_SECRET" \
  http://<TRUENAS_IP>:30080/api/debug/db/init | jq
```

Expected response:

```json
{
  "ok": true,
  "dbPath": "/data/proman.sqlite",
  "pushOut": "...",
  "genOut": "..."
}
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

**App shows "Deploying" indefinitely:**

- Check pod logs: `kubectl logs -l app=proman -n ix-proman --tail=100`
- Verify the dataset path is correct and writable

**Cannot access the app after install:**

- Check NodePort: `kubectl get svc -n ix-proman`
- Try port-forward: `kubectl port-forward svc/proman 3000:80 -n ix-proman`

**Database errors after TrueNAS update:**

- Re-run database init (see above)
- Check dataset permissions haven't changed

## Removing the App

```bash
# Via Helm
helm uninstall proman -n ix-proman

# Or via TrueNAS Apps UI → select app → Delete
```

The persistent dataset is **not** deleted automatically. Remove manually if desired.
