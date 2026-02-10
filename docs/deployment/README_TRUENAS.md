# TrueNAS SCALE — Custom App / Helm notes for ProMan

## Overview

This file contains quick instructions and recommended Helm values to deploy ProMan on TrueNAS SCALE.
TrueNAS SCALE commonly uses NodePort services and hostPath mounts for app storage when running single-node apps.

## Quick steps (recommended)

1. Edit `helm/proman/values-truenas.yaml`:
   - Replace `<POOL_NAME>` with your TrueNAS pool, e.g. `/mnt/pools/tank/apps/proman/data`.
   - Replace `<TRUENAS_IP_OR_HOSTNAME>` and set a secure `NEXTAUTH_SECRET`.

2. (Optional) Adjust `nodePort` if `30080` is already used on your cluster.

3. Install with Helm from the machine that can reach the cluster (or use TrueNAS UI "Custom App" with the chart):

```bash
helm upgrade --install proman ./helm/proman -f helm/proman/values-truenas.yaml --namespace proman --create-namespace
```

## Access

- If using NodePort default above, open:
  `http://<TRUENAS_IP>:30080`
- If you enable ingress in your cluster, configure host and TLS accordingly.

## Database / Persistence

- The example uses SQLite via a hostPath file at `/app/data/proman.db` inside the container (mounted from TrueNAS hostPath).
- HostPath setup example (values): `hostPath: /mnt/pools/<POOL_NAME>/apps/proman/data` (mounted to `/app/data` inside the pod)
- Important: `hostPath` is suitable for single-node installs, but not for multi-node HA. If you need durability across node restarts or scheduling, use a TrueNAS CSI-backed PVC (if available) and set `persistence.storageClass`.

Note: the Helm chart includes a post-install/post-upgrade Job that will run Prisma initialization (`npx prisma db push && npx prisma generate`) automatically when `persistence.enabled` is true and a PVC is available. This ensures the schema (including `users`) is created on install or upgrade.

## Environment variables

- Ensure `NEXTAUTH_URL` is set to your reachable app URL.
- Set `NEXTAUTH_SECRET` to a secure random value.
- If using Google OAuth, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Helm values or via a Kubernetes Secret.

## Ports

- NodePort default: `30080` → internal container port `3000`.
- HTTPS: TrueNAS may expose via reverse proxy/ingress — configure TLS there or change chart to use a TLS-enabled ingress controller.

## Security & Backups

- Back up the hostPath directory regularly.
- Consider moving to a managed DB (Postgres) for production workloads requiring HA.

## Troubleshooting

- Logs: `kubectl -n proman logs -l app.kubernetes.io/name=proman`
- Health endpoint: `GET /api/health` should return JSON status.
