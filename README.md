[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# ProMan — Property Management Dashboard

Lightweight, self-hosted property management built with Next.js and Prisma. This README is a concise deployment and quick-start guide focused on running ProMan on TrueNAS SCALE or similar platforms.

Quick commands

```bash
# Install deps
npm install

# Development (mock data by default)
cp .env.example .env
npm run dev

# Build for production
npm run build
npm run start
```

Minimal environment variables for a TrueNAS Scale app

- `DATABASE_URL` (recommended): `file:/data/proman.sqlite` — required for a real SQLite-backed install
- `INIT_SECRET` (recommended): secret to protect DB init endpoint (see Database initialization below)

Auth and optional integrations

- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` are only required when authentication is enabled. To keep the deployment surface minimal, you can start with authentication disabled and set these later.
- Feature flags (opt-in):
  - `ENABLE_STRIPE=false` — set to `true` and provide `STRIPE_SECRET_KEY` to enable payments
  - `ENABLE_SENDGRID=false` — set to `true` and provide `SENDGRID_API_KEY` to enable email delivery
  - `ENABLE_OAUTH=false` — set to `true` and provide `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to enable Google login

Start with the minimal set above and enable optional services only when needed — this avoids requiring secrets at build-time and keeps TrueNAS app manifests small.

Prestart controls (useful on TrueNAS)

- `SKIP_PRESTART=true` — skip prestart checks entirely (platform-managed lifecycle)
- `PRESTART_CHECK_HOSTPORT=true` — enforce HOSTNAME/PORT checks
 - `PRESTART_FAIL_ON_SQLITE=true` — when enabled, prestart will fail (non-zero exit) if sqlite preparation/validation fails; keep `false` for TrueNAS deployments to allow operator remediation.

Deploy notes (TrueNAS SCALE)

- Use the TrueNAS App UI to set environment variables (or Helm `values-truenas.yaml` / k8s Secret references).
- For secrets, prefer Kubernetes `Secret` or TrueNAS secret fields rather than embedding values in `values.yaml`.
- Start with a minimal set: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Enable optional integrations only when needed.

Where to look next

- Full list of env vars and examples: [.env.example](.env.example)
- Helm / TrueNAS packaging: `helm/proman/*` and `helm/proman/values-truenas.yaml`

Support

- Issues & discussions: https://github.com/JIGLE/proman

License: MIT

  - Tag-triggered runs assert that the tag version (without `v`) matches `package.json` — if they differ the run will fail and prompt you to resolve the mismatch.
  - Use the `version` workflow input when using manual dispatch to override version detection.

When restarting or updating the app in TrueNAS SCALE:
- Use the specific image tag from the release (do not rely on `latest`).
- Verify runtime version:
  - GET `/version.json` (returns `{"version","git_commit","build_time"}`).
  - `kubectl get deployment proman -o yaml` and inspect `metadata.annotations` for `app.kubernetes.io/version` or `proman.image`.

Showing the app icon, version and source in TrueNAS App Info
- TrueNAS reads chart/package metadata (Chart.yaml) and the packaged chart when rendering the App Info panel. To make the **Version**, **Source** and **Logo** visible in the TrueNAS UI:
  1. Ensure `Chart.yaml` contains `version`, `appVersion`, `home`, `sources` and `icon` (already present in this repo). We updated `version` and `appVersion` to `1.1.0`.
  2. Repackage the Helm chart and upload the chart to your TrueNAS catalog or install/upgrade the Custom App using the packaged chart file (`.tgz`).
  3. In the TrueNAS Apps UI, use the uploaded chart or catalog entry when installing — the App Info panel will show Version, Source and Logo from the chart metadata.

If you'd like, I can also: (a) create the packaged chart artifact (`helm package`) and add it to `release-charts/` for you, or (b) add a small helper script in `scripts/` to repackage and upload the chart to your TrueNAS catalog. Which do you prefer?
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

Notes & `INIT_SECRET` (security & deployment)
- The `POST /api/debug/db/init` route will create the DB file (if missing), run `npx prisma db push` and `npx prisma generate` (skipped in `NODE_ENV=test`). In production **protect this endpoint** by setting a strong `INIT_SECRET` to avoid unauthorized schema changes.

What `INIT_SECRET` does
- `INIT_SECRET` is a shared secret the server expects for one of two verification methods when initializing the DB in production:
  - Bearer token: `Authorization: Bearer <INIT_SECRET>` (simple and common), or
  - HMAC: `X-Signature` header containing HMAC-SHA256 of the payload (method+url+secret) for environments that prefer signatures.
- The endpoint only accepts POST for initialization; GET will return 405.

Generate a secret (example)
```bash
# 32 bytes hex (recommended)
openssl rand -hex 32
# or
head -c 32 /dev/urandom | base64
```

Calling the endpoint
- Bearer (recommended and simple):
```bash
curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" https://your-host.example.com/api/debug/db/init | jq
```

- HMAC (alternative):
```bash
SIGNATURE=$(printf '%s%s%s' "POST" "https://your-host.example.com/api/debug/db/init" "$INIT_SECRET" | openssl dgst -sha256 -hex | sed 's/^.* //')
curl -sS -X POST -H "X-Signature: $SIGNATURE" https://your-host.example.com/api/debug/db/init | jq
```

TrueNAS Scale / Helm / Kubernetes guidance
- TrueNAS Scale (Custom App UI): add `INIT_SECRET` in the **Environment Variables** section when installing or editing the app. This is the simplest and safest option in the SCALE UI.
- Helm (values file): you can add an `env` entry in `helm/proman/values-truenas.yaml`:
```yaml
env:
  - name: INIT_SECRET
    value: "<your-secret>"
```
- Kubernetes secret (preferred for production): create a k8s Secret and reference it in your deployment (the repo's `k8s/deployment.yaml` demonstrates using `valueFrom.secretKeyRef`):
```bash
kubectl create secret generic proman-secrets --from-literal=INIT_SECRET="$(openssl rand -hex 32)" -n <namespace>
```
- Important: do not expose `INIT_SECRET` to the browser or commit it to source control. The app's client-side code intentionally does not include the secret — calls from the browser will fail with 401/403 if the secret is required.

Automation (GitHub Actions example)
- To run initialization as part of CI/CD (after the app is deployed) put a step in your workflow that uses the repository secret `INIT_SECRET`:
```yaml
- name: Initialize DB
  env:
    INIT_SECRET: ${{ secrets.INIT_SECRET }}
  run: |
    curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" https://your-host.example.com/api/debug/db/init | jq
```

In-app release notifications
- ProMan supports in-app update notifications for administrators and an optional webhook to notify the running instance when a new release is published.

Enable webhook notifications (recommended)
1. Create an `UPDATE_WEBHOOK_SECRET` repository secret with a strong random value.
2. Add the secret as an environment variable to your production app (e.g. TrueNAS Custom App env or k8s Secret `UPDATE_WEBHOOK_SECRET`).
3. Update your release workflow to POST to the running instance after the GitHub Release is created (example below).

GitHub Actions snippet (add to `release.yml` after Create GitHub Release step):
```yaml
- name: Notify running instance of new release
  if: env.UPDATE_WEBHOOK_URL != '' && secrets.UPDATE_WEBHOOK_SECRET
  env:
    UPDATE_WEBHOOK_SECRET: ${{ secrets.UPDATE_WEBHOOK_SECRET }}
    UPDATE_WEBHOOK_URL: ${{ secrets.UPDATE_WEBHOOK_URL }}
  run: |
    echo "Notifying running instance: $UPDATE_WEBHOOK_URL"
    curl -sS -X POST -H "Authorization: Bearer $UPDATE_WEBHOOK_SECRET" -H "Content-Type: application/json" \
      -d '{"tag_name": "v${{ steps.version.outputs.new_version }}", "name":"v${{ steps.version.outputs.new_version }}", "html_url": "https://github.com/${{ github.repository }}/releases/tag/v${{ steps.version.outputs.new_version }}" }' \
      "$UPDATE_WEBHOOK_URL/api/updates" || true
```

Poll for updates (fallback)
- The app also exposes `GET /api/updates` to return cached/latest release info; the UI checks this endpoint periodically when admins are signed in.

Summary
- Create `UPDATE_WEBHOOK_SECRET` and `UPDATE_WEBHOOK_URL` (as a repo secret and as an app environment variable respectively) to enable immediate, secure notification of new releases. The app will then show a dismissible banner to users with `ADMIN` role when a newer version is available.

Summary
- For production installs on TrueNAS Scale: set `INIT_SECRET` (either via App UI env, Helm values, or a Kubernetes Secret), then initialize the DB from a trusted admin machine or CI/CD pipeline using that secret.

After successful init, retry the sign-in flow — the `signIn` callback will create the user record on first login if needed.


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



