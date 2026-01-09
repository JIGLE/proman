This folder contains Kubernetes manifests to deploy Proman on TrueNAS SCALE.

Usage (kubectl):

1. Create secrets (example):

```bash
kubectl create secret generic proman-secrets \
  --from-literal=NEXTAUTH_SECRET='replace-me' \
  --from-literal=SENDGRID_API_KEY='replace-me' \
  --from-literal=INIT_SECRET='replace-me'
```

2. Create a PersistentVolumeClaim or use an existing one named `proman-data`.

3. Apply manifests:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Notes:
- `DATABASE_URL` is set to `file:/data/proman.sqlite` and the container mounts the PVC at `/data`.
- After deploy, initialize the DB (one-time) by calling the init endpoint with `INIT_SECRET`.
