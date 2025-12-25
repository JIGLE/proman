# Proman
<!-- GitHub Actions status badge for the publish-ghcr workflow -->
[![Build and publish to GHCR](https://github.com/JIGLE/proman/actions/workflows/publish-ghcr.yml/badge.svg)](https://github.com/JIGLE/proman/actions/workflows/publish-ghcr.yml)

Minimal property management dashboard (Next.js).

## Quick Start

1) Pull and run:

```bash
docker pull ghcr.io/jigle/proman:latest
docker run -d -p 3000:3000 --env NODE_ENV=production --name proman ghcr.io/jigle/proman:latest
```

2) Open: http://localhost:3000

## PostgreSQL setup (recommended for production)

Proman works with PostgreSQL in production to avoid file-permission limitations of SQLite in containerized environments.

1. Install PostgreSQL in TrueNAS SCALE (Apps → Available Apps → PostgreSQL) or deploy a managed Postgres instance.
2. Configure persistent storage for the database and set credentials:
   - `POSTGRES_DB=proman`
   - `POSTGRES_USER=proman_user`
   - `POSTGRES_PASSWORD=your_secure_password`
3. Set `DATABASE_URL` in Proman app environment variables to point at your Postgres instance, e.g.:
   - `DATABASE_URL=postgresql://proman_user:your_secure_password@proman-postgres:5432/proman`
4. Redeploy Proman and run migrations:
   - `npx prisma migrate deploy` (inside the Proman container or during deployment); if you don't have migration files yet, run `npx prisma db push` to apply the schema directly.

## Google OAuth Setup

To enable Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Set authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
6. Copy Client ID and Client Secret
7. Set environment variables:
   - `GOOGLE_CLIENT_ID=your_client_id`
   - `GOOGLE_CLIENT_SECRET=your_client_secret`
   - `NEXTAUTH_SECRET=your_random_secret` (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL=https://your-domain.com` (your app's URL)

## Features

### 🔐 Authentication
- Google OAuth 2.0 login
- Secure JWT-based sessions
- Custom signin/error pages

### 👤 User Profile & Settings
- **Profile Page** (`/profile`): View account info, avatar, and statistics
- **Settings Page** (`/settings`): Comprehensive preference management
  - Notifications (email, push, reminders)
  - Appearance (theme, language)
  - Preferences (timezone, currency)
  - Privacy & security controls

### 🏠 Property Management
- Dashboard overview
- Properties management
- Tenants tracking
- Financials & receipts

## TrueNAS SCALE (recommended)
- Apps → Discover Apps → Custom App
- Image: `ghcr.io/jigle/proman:latest` (public)
- Envs: `NODE_ENV=production`, `PORT=3000`, `GOOGLE_CLIENT_ID=your_id`, `GOOGLE_CLIENT_SECRET=your_secret`, `NEXTAUTH_SECRET=your_secret`, `NEXTAUTH_URL=https://your-domain.com`
- Ports: Container 3000 → Node port (e.g., 3000)
- Storage: Host path → `/data`
- Health: `GET /api/health` → `{ status: 'ok' }`

## Fallback: Local tar

```bash
./scripts/build-and-save.sh ghcr.io/jigle/proman:latest proman.tar
scp proman.tar root@TRUENAS:/tmp/
ssh root@TRUENAS "docker load -i /tmp/proman.tar"
```

## CI
- Workflow: `.github/workflows/publish-ghcr.yml` builds, tags and publishes to GHCR on `main` (also supports manual `workflow_dispatch`).
   - The workflow sets `VERSION`, `GIT_COMMIT`, and `BUILD_TIME` and passes them as build-args and image labels so the running app can expose its build info at `/api/info`.
   - The workflow uses `GITHUB_TOKEN` to publish to GHCR; no additional secrets are required for the repo to publish from GitHub Actions.

License: MIT

## 📦 TrueNAS SCALE (no registry required)

If you don't want to push to a registry you can build an image tar and import it into TrueNAS SCALE.

- Build and save an image tar locally:

```bash
./scripts/build-and-save.sh proman:local proman_local_image.tar
```

- Upload the `proman_local_image.tar` to your TrueNAS SCALE host and load it there:

```bash
docker load -i proman_local_image.tar
```

- Package the Helm chart (optional) and install on SCALE's Kubernetes cluster:

```bash
./scripts/package-helm.sh dist
helm install proman helm/proman -f helm/proman/values.yaml
```

Alternatively, create a Custom App in the SCALE Apps UI and reference the image you loaded on the nodes or use the packaged chart.

## 🧩 Install as a TrueNAS SCALE Custom App

Follow these steps to install `Proman` as a Custom App on TrueNAS SCALE without pushing to a registry.

### Quick install (recommended)

If you already know how to add a Git catalog in SCALE, these are the minimal steps to get `Proman` running:

1. Build and save the image tar locally:

```bash
./scripts/build-and-save.sh proman:local proman_local_image.tar
```

2. Copy the tar to each SCALE node and import it:

```bash
scp proman_local_image.tar root@TRUENAS_NODE:/root/
ssh root@TRUENAS_NODE "ctr -n=k8s.io images import /root/proman_local_image.tar"
```

3. Add this repository as a SCALE Catalog (Apps → Manage Catalogs → Add Catalog) using the Git URL `https://github.com/JIGLE/Proman` and branch `main`.

4. Install the app from Apps → Available Applications → `proman` and in the install form **pick a dataset** by either selecting an existing PVC name for `persistence.existingClaim` or leaving it blank and setting `persistence.storage` (the chart will create a PVC).

That's it — the chart defaults to `image.repository=proman` and `image.tag=local`, so SCALE will use the image you loaded on the nodes.


1) Build the image tar (local machine):

```bash
./scripts/build-and-save.sh proman:local proman_local_image.tar
```

2) Copy the tar to a SCALE host and import it into the node's image store (example using SSH):

```bash
scp proman_local_image.tar root@TRUENAS_HOST:/tmp/
ssh root@TRUENAS_HOST "docker load -i /tmp/proman_local_image.tar"
```

If your SCALE installation uses containerd/k3s without `docker`, import with containerd on the host:

```bash
ctr -n=k8s.io images import /tmp/proman_local_image.tar
```

3) Option A — Install via the Apps UI (recommended for non-cluster admins):

- In TrueNAS SCALE go to **Apps → Launch Docker Image** (or **Create App → Use YAML/Custom App**).
- For the image name enter `proman:local` (or the tag you used when loading the tar).
- Set the container port `3000`, add environment variable `NODE_ENV=production`, and configure storage mounts if you need persistence.
- Deploy the app and use the SCALE UI to add Routes/Ingress as needed.

4) Option B — Install using the packaged Helm chart or YAML (advanced/admin):

- Package the Helm chart locally:

```bash
./scripts/package-helm.sh dist
```

- Copy the chart (`dist/proman-*.tgz`) to a node or upload it to your internal chart repo and then from a system with `kubectl`/`helm` configured for the SCALE cluster run:

  **TrueNAS SCALE quick install:** If you prefer the SCALE UI, go to Apps → Discover → Custom App → Install via YAML and paste `dist/proman-with-ingress.yaml` (edit image tag / PVC size / ingress host before install).

```bash
helm install proman helm/proman -f helm/proman/values.yaml
# OR (if you uploaded the chart file)
helm install proman dist/proman-0.2.0.tgz
```

- If you prefer raw YAML, update `k8s/proman-deployment.yaml` to use the image tag you loaded (e.g., `proman:local`) and install it via the Apps UI YAML option or with `kubectl apply -f k8s/proman-deployment.yaml`.

5) Post-install

- If you used Helm, run the NOTES printed by Helm or port-forward to the pod:

```bash
kubectl port-forward svc/proman 3000:3000
# then open http://localhost:3000
```

- To remove the app:

```bash
helm uninstall proman  # or remove via the SCALE Apps UI
```

Notes:
- If SCALE nodes cannot access the image by the same `proman:local` tag, load the tar on each node or use a local registry on your network.
- Adjust `helm/proman/values.yaml` for Ingress, resources, or service type before installing.

## 🎁 Produced artifacts (in this repository)

- Image tar: `proman_local_image.tar` — built with `make save-image` (or `./scripts/build-and-save.sh`). (Optional; may be available in `releases/`)
- Packaged Helm chart: `dist/proman-*.tgz` (current v0.2.1) — created with `make package-helm` (or `./scripts/package-helm.sh`).

Use these to install on TrueNAS SCALE without a registry:

1. Copy and load the image tar on each SCALE node:

```bash
scp proman_local_image.tar root@TRUENAS_NODE:/root/
# on the node (containerd):
ctr -n=k8s.io images import /root/proman_local_image.tar
# or if docker is available on the node:
docker load -i /root/proman_local_image.tar
```

2. Install the packaged chart on the SCALE cluster (from a machine with `helm` configured for the cluster):

```bash
helm install proman dist/proman-0.2.0.tgz \
	--set image.repository=proman \
	--set image.tag=local \
	--set image.pullPolicy=IfNotPresent \
	--set persistence.enabled=true --set persistence.storage=5Gi
```

3. Or use the SCALE Apps UI to add this Git repo as a Catalog and install the chart via the UI. In the install form choose an existing dataset or let the chart create a PVC by leaving `persistence.existingClaim` empty and setting the desired `persistence.storage` value.

4. Helpful Make commands (local):

```bash
make build-image    # docker build -t proman:local .
make save-image     # builds and saves proman_local_image.tar
make package-helm   # packages helm/proman into dist/
```

If you want me to upload the artifacts somewhere or render the final YAML for your target values, tell me where and I will do it.

## Registry-based install (no local image tar)

If you prefer to avoid building and loading image tars on SCALE nodes, use the published image on GitHub Container Registry (GHCR). The repository workflow ` .github/workflows/publish-ghcr.yml` builds and pushes images to `ghcr.io/<owner>/proman` with versioned tags and `latest`.

Install the chart and use the GHCR image (replace `<owner>` with your GitHub org/user):

```bash
helm install proman dist/proman-0.2.1.tgz \
   --set image.repository=ghcr.io/<owner>/proman \
   --set image.tag=latest \
   --set image.pullPolicy=IfNotPresent \
   --set persistence.enabled=true --set persistence.storage=5Gi
```

Notes:
- The Actions workflow uses `GITHUB_TOKEN` to publish to GHCR from this repository; no additional secrets are required for publishing from GitHub Actions.
- If you want TrueNAS to pull a private GHCR image, create a personal access token (PAT) with `read:packages` and configure the registry credentials in TrueNAS.

## 🚀 Deployment

### TrueNAS SCALE Custom App (Recommended)
1. Ensure the Docker image is pushed to GHCR (via GitHub Actions on push to `main`).
2. In TrueNAS SCALE UI: **Apps > Discover Apps > Custom App**.
3. Configure:
   - **Application Name**: `proman`
   - **Image Repository**: `ghcr.io/jigle/proman:latest`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `PORT=3000`
   - **Port Forwarding**: Container Port `3000` → Node Port `3000` (or your choice)
   - **Storage**: Host Path `/mnt/pool/data` → Mount Path `/data`
4. Launch the app. Access at `http://your-truenas-ip:node-port`.

### Registry visibility & Actions permissions
- The workflow publishes to `ghcr.io/JIGLE/proman:latest` using `GITHUB_TOKEN`. Ensure **Actions** permissions allow `packages: write` (Repository Settings → Actions → General → Workflow permissions).
- For TrueNAS to pull without authentication, make the package public: GitHub → `Settings` → `Packages` → `proman` → **Package settings** → **Change visibility** → **Public**. (Done — package is public.)
- Alternatively, keep the package private and configure TrueNAS with registry credentials (PAT with `read:packages`).

### Alternative: Local Tar
If registry access fails, use the build script:
```bash
./scripts/build-and-save.sh ghcr.io/jigle/proman:latest proman.tar
```
Transfer `proman.tar` to TrueNAS, load with `docker load -i proman.tar`, then use the image in Custom App.


