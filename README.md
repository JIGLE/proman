# Proman

Minimal property management dashboard (Next.js).

## Quick Start

1) Pull and run:

```bash
docker pull ghcr.io/jigle/proman:latest
docker run -d -p 3000:3000 --env NODE_ENV=production --name proman ghcr.io/jigle/proman:latest
```

2) Open: http://localhost:3000

## TrueNAS SCALE (recommended)
- Apps → Discover Apps → Custom App
- Image: `ghcr.io/jigle/proman:latest` (public)
- Envs: `NODE_ENV=production`, `PORT=3000`
- Ports: Container 3000 → Node port (e.g., 3000)
- Storage: Host path → `/data`
- Health: `GET /api/health` → `{ status: 'ok' }`

**Catalog / Icon:**
- This repo includes a minimal Helm chart at `helm/proman/` and an app icon at `public/icon-128.svg`.
- Add the repo as a Catalog in TrueNAS SCALE (Apps → Manage Catalogs → Add Catalog) using `https://github.com/JIGLE/proman` and branch `main` — the chart's `Chart.yaml` includes an `icon` entry so the app will appear with the icon in the SCALE UI. (Installing from a Catalog marks the app as an ix-app and the UI will append `(ix-app)` to the app name.)

## Fallback: Local tar

```bash
./scripts/build-and-save.sh ghcr.io/jigle/proman:latest proman.tar
scp proman.tar root@TRUENAS:/tmp/
ssh root@TRUENAS "docker load -i /tmp/proman.tar"
```

## CI
- Workflow: `.github/workflows/docker-publish.yml` pushes to GHCR on `main`.

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

If you prefer to avoid building and loading image tars on SCALE nodes, use the published image on Docker Hub. Push `docker.io/jig019/proman:latest` (or use your preferred registry) and set the image repo in values when installing.

> CI: This repository contains a workflow (`.github/workflows/dockerhub-publish.yml`) that can publish `docker.io/jig019/proman:latest` automatically on pushes to `main`. To enable it, add repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (Docker Hub Access Token).

Install the chart and use the registry image (default values already point to Docker Hub):

```bash
helm install proman dist/proman-0.2.1.tgz \
	--set image.repository=docker.io/jig019/proman \
	--set image.tag=latest \
	--set image.pullPolicy=IfNotPresent \
	--set persistence.enabled=true --set persistence.storage=5Gi
```

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


