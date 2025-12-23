This folder contains Kubernetes/Compose artifacts for installing Proman on TrueNAS SCALE.

Files:
- `docker-compose.yml` — uses the public GHCR image (`ghcr.io/jigle/proman:latest`). Use this when the image is public or when you have configured registry credentials in SCALE.
- `docker-compose-local-example.yml` — example for local installs where the image is imported on SCALE nodes as `proman:local`. **Do not** upload this file if you expect SCALE to pull from GHCR.
- `proman-with-ingress.yaml` — Kubernetes manifest rendered from the Helm chart with ingress enabled; edit `image:` and `ingress.host` before installing.

Choose the file that matches your install method and edit it as needed before pasting/uploading into the SCALE UI.
