## Proman — TrueNAS SCALE Custom App install

This README provides concise, step-by-step instructions to install Proman as a Custom App on TrueNAS SCALE. Two main options are supported:

- Registry-based install (pull `ghcr.io/jigle/proman:latest`) — simplest when GHCR is accessible from SCALE.
- Local image tar (no registry) — useful when nodes cannot reach GHCR or you prefer local images.

### Prerequisites
- TrueNAS SCALE with Apps enabled
- A dataset for persistence (or allow the chart to create a PVC)
- `kubectl` / `helm` (optional, for advanced installs)

### Option A — Install from GHCR (registry)
1. In TrueNAS SCALE UI go to **Apps → Launch Docker Image** (or **Create App → Use YAML/Custom App**).
2. Set image: `ghcr.io/jigle/proman:latest`.
3. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `NEXTAUTH_URL=https://your.domain` (set to your external URL)
   - `NEXTAUTH_SECRET` (set a secure random value)
   - Any provider secrets (e.g. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SENDGRID_API_KEY`).
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
   helm install proman ./helm/proman --set image.repository=ghcr.io/jigle/proman --set image.tag=latest
   ```
2. Customize `values.yaml` for `persistence`, `service.type` (NodePort/ClusterIP), and `ingress` before installing.

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

### Security & registry notes
- Public GHCR image: `ghcr.io/jigle/proman:latest` is public and can be pulled without credentials.
- Private registry: if you use a private GHCR image set registry credentials (PAT with `read:packages`) in SCALE.

### Removing the app
- If installed via Helm: `helm uninstall proman` or remove via the SCALE Apps UI.

If you want, I can:
- Render a ready-to-install YAML (with your nodePort, hostname and secrets redacted), or
- Help test a live install (port-forward, logs parsing) if you provide the cluster outputs.

License: MIT
```



