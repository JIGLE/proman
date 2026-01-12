[![Publish Release](https://github.com/JIGLE/proman/actions/workflows/publish-ghcr.yml/badge.svg)](https://github.com/JIGLE/proman/actions/workflows/publish-ghcr.yml)

## Proman — TrueNAS SCALE Custom App install

This README provides concise, step-by-step instructions to install Proman as a Custom App on TrueNAS SCALE. Two main options are supported:

- Registry-based install (pull `ghcr.io/jigle/proman:<tag>`) — use an explicit tag (e.g., `ghcr.io/jigle/proman:0.1.1`); avoid `latest` for production installs.
- Local image tar (no registry) — useful when nodes cannot reach GHCR or you prefer local images.

### Prerequisites
- TrueNAS SCALE with Apps enabled
- A dataset for persistence (or allow the chart to create a PVC)
- `kubectl` / `helm` (optional, for advanced installs)

### Option A — Install from GHCR (registry)
1. In TrueNAS SCALE UI go to **Apps → Launch Docker Image** (or **Create App → Use YAML/Custom App**).
2. Set image: `ghcr.io/jigle/proman:<version>` (use a specific tag; avoid `latest`).
3. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `HOSTNAME=0.0.0.0` (default in image)
   - `NEXTAUTH_URL=https://your.domain` (set to your external URL)
   - `NEXTAUTH_SECRET` (set a secure random value)
   - Any provider secrets (e.g. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SENDGRID_API_KEY`).

Note: the image includes defaults (`HOSTNAME=0.0.0.0`, `PORT=3000`) and the container runs a pre-start check that will fail startup if `HOSTNAME` or `PORT` are missing or invalid. Set these values in the TrueNAS Apps UI or Helm `values.yaml` when installing.
4. Ports: map container `3000` to a NodePort (or let SCALE assign one). Example: NodePort 30555 → container 3000.
5. Storage: map a dataset (Host Path) to `/data` inside the container; this stores the SQLite DB (`/data/proman.sqlite`).
6. Deploy and verify:
   - In SCALE Apps UI confirm the app becomes `Running`.
   - Health endpoint: `GET http://<node-ip>:<node-port>/api/health` should return `{ "status": "ok" }`.

### Option B — Install using a local image tar (no registry)
1. Build and save image tar locally (on your workstation):
   ```bash
   ./scripts/build-and-save.sh proman:local proman_local_image.tar
   ```
2. Copy the tar to each SCALE node and import it (example using SSH):
   ```bash
   scp proman_local_image.tar root@TRUENAS_NODE:/root/
   # If SCALE node uses containerd/k3s:
   ssh root@TRUENAS_NODE "ctr -n=k8s.io images import /root/proman_local_image.tar"
   # Or if docker is available on the node:
   ssh root@TRUENAS_NODE "docker load -i /root/proman_local_image.tar"
   ```
3. In the Apps UI use the image name you loaded (e.g., `proman:local`) and configure envs, ports and storage as in Option A.

### Option C — Install via Helm (advanced)
1. From a machine with `kubectl`/`helm` configured for SCALE's k8s cluster:
   ```bash
   helm install proman ./helm/proman --set image.repository=ghcr.io/jigle/proman --set image.tag=<version>  # use a specific tag (avoid latest)
   ```
2. Customize `values.yaml` for `persistence`, `service.type` (NodePort/ClusterIP), and `ingress` before installing.

### Releases

We publish Docker images to GitHub Container Registry (GHCR) and package the Helm chart with the app's release version. Use explicit image tags for installs and updates — avoid using `latest` for production.


## Releases

- Date: 2026-01-12
- Version: 0.1.4
- Image: ghcr.io/jigle/proman:0.1.4
- Notes: automated release

Releases are recorded here so you can see which image is pulled when restarting the app.

Release note template:
- Date: YYYY-MM-DD  
- Version: vX.Y.Z  
- Image: `ghcr.io/jigle/proman:VERSION`  
- Notes: short description

Example:
- Date: 2026-01-10  
- Version: 0.1.1  
- Image: `ghcr.io/jigle/proman:0.1.1`  
- Notes: "Bugfix: DB handling on first init."

### How to release ✅

Releases are created from the `publish-ghcr.yml` workflow. The recommended and safest method is to publish by creating an annotated tag `vX.Y.Z`. You can also run the workflow manually (via **Actions → Build and publish to GHCR → Run workflow**) and use the `dry_run` and `version` inputs for testing and overrides.

- Recommended (tag-based release):
  1. Update the package version: `npm version X.Y.Z --no-git-tag-version`
  2. Commit the change: `git add package.json package-lock.json && git commit -m "chore(release): X.Y.Z"`
  3. Create a tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
  4. Push the tag: `git push origin vX.Y.Z`
  - The workflow will build and push images, package the Helm chart, and create a Release automatically.

- Manual dry-run (inspect artifacts without creating a Release):
  - Go to **Actions → Build and publish to GHCR → Run workflow**.
  - Set `dry_run=true` and optionally `version=X.Y.Z` to override.
  - The workflow uploads `release-charts` as an artifact and shows a release-note preview for inspection.

- Notes & safeguards:
  - Tag-triggered runs assert that the tag version (without `v`) matches `package.json` — if they differ the run will fail and prompt you to resolve the mismatch.
  - Use the `version` workflow input when using manual dispatch to override version detection.

When restarting or updating the app in TrueNAS SCALE:
- Use the specific image tag from the release (do not rely on `latest`).
- Verify runtime version:
  - GET `/version.json` (returns `{"version","git_commit","build_time"}`).
  - `kubectl get deployment proman -o yaml` and inspect `metadata.annotations` for `app.kubernetes.io/version` or `proman.image`.

### Post-install checks and troubleshooting
- Check pod status and logs:
  ```bash
  kubectl get pods -l app=proman -n <namespace> -o wide
  kubectl logs deployment/proman -n <namespace> --tail=200
  kubectl describe pod <pod-name> -n <namespace>
  ```
- If the app is `Running` but unreachable externally:
  - If you used NodePort, curl the node IP and port: `curl -v http://<node-ip>:<node-port>`.
  - Use port-forward to test locally: `kubectl port-forward svc/proman 3000:80 -n <namespace>` then `curl http://localhost:3000`.
- If you see database permission errors, confirm the dataset is mounted at `/data` and writable by the container (fsGroup in deployment can help).
- Ensure `NEXTAUTH_URL` matches the externally reachable URL (used by NextAuth redirects).

### Database initialization & recovery
If you see an error like `no such table: main.users` the SQLite database file exists but the Prisma schema (tables) were not applied. The Helm chart includes a post-install/post-upgrade Job that will automatically apply the Prisma schema when `persistence.enabled` is true (it runs `npx prisma db push && npx prisma generate`). You have two safe options to initialize the schema.

1) Use the built-in init endpoint (recommended)

- If you configured `INIT_SECRET` (recommended), send Authorization header:

```bash
curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" http://<node-ip>:<node-port>/api/debug/db/init | jq
```

- If you did not set `INIT_SECRET` (dev/test):

```bash
curl -sS -X POST http://<node-ip>:<node-port>/api/debug/db/init | jq
```

- Expected success: `{ "ok": true, "dbPath": "/data/proman.sqlite", "pushOut": "...", "genOut": "..." }`

2) Run Prisma commands manually inside the running container or Pod

- Docker:

```bash
docker exec -it <container> sh -c 'npx prisma db push && npx prisma generate'
```

- Kubernetes:

```bash
kubectl exec -it <pod> -- npx prisma db push && kubectl exec -it <pod> -- npx prisma generate
```

Verify tables exist:

```bash
# inside host/container where /data is mounted
sqlite3 /data/proman.sqlite '.tables'
```

Temporary emergency fallback

- You can allow sign-ins while DB is broken (not recommended long-term) by setting the environment variable `NEXTAUTH_ALLOW_DB_FAILURE=true` in your App/Helm values. This bypasses DB-dependent creation and lets sign-in proceed.

Notes
- The `POST /api/debug/db/init` route will create the DB file (if missing), run `npx prisma db push` and `npx prisma generate` (skipped in `NODE_ENV=test`). Protect it with `INIT_SECRET` in production to avoid unauthorized schema changes.
- After successful init, retry the sign-in flow — the `signIn` callback will create the user record on first login if needed.


### Security & registry notes
- Public GHCR image: `ghcr.io/jigle/proman:<tag>` is available and can be pulled without credentials; prefer a fixed tag (e.g., `ghcr.io/jigle/proman:0.1.1`) for reproducible deployments.
- Private registry: if you use a private GHCR image set registry credentials (PAT with `read:packages`) in SCALE.

### Removing the app
- If installed via Helm: `helm uninstall proman` or remove via the SCALE Apps UI.

If you want, I can:
- Render a ready-to-install YAML (with your nodePort, hostname and secrets redacted), or
- Help test a live install (port-forward, logs parsing) if you provide the cluster outputs.

License: MIT
```



