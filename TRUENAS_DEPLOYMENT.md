# ProMan Deployment Guide for TrueNAS SCALE

This guide covers deploying ProMan as a custom application on TrueNAS SCALE using Kubernetes and Helm charts.

## Prerequisites

- TrueNAS SCALE (tested on 24.04+)
- Kubernetes enabled and running on TrueNAS
- kubectl configured to access your cluster
- Helm 3.x installed
- Docker (for building custom images)

## Architecture

ProMan runs as a Kubernetes deployment with:
- **App Container**: Next.js application (Node.js)
- **Database**: SQLite with persistent PVC (Persistent Volume Claim)
- **Service**: NodePort for external access (port 3000)
- **Storage**: hostPath volume for database persistence

## Step 1: Prepare Environment Configuration

Create a `.env` file with your production settings:

```bash
# Copy the template
cp .env.example .env

# Edit with your settings
nano .env
```

**Required variables for production:**

```bash
# Database
DATABASE_URL=file:./data/dev.db

# NextAuth (generate a random secret)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret-here

# Google OAuth
GOOGLE_ID=your-google-id
GOOGLE_SECRET=your-google-secret

# SendGrid Email
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_WEBHOOK_PUBLIC_KEY=your-sendgrid-public-key

# Debug endpoints disabled in production automatically
# Only set these if you need local development debugging
DEBUG_MODE=false
INIT_SECRET=your-init-secret

# Application
NODE_ENV=production
```

## Step 2: Build and Push Docker Image

### Option A: Using GitHub Container Registry (Recommended)

```bash
# Build multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/yourusername/proman:latest \
  --push \
  .

# Tag as latest version
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/yourusername/proman:0.5.3 \
  --push \
  .
```

### Option B: Build Locally on TrueNAS

If TrueNAS has Docker/Podman installed:

```bash
# On TrueNAS
docker build -t proman:latest .
docker tag proman:latest proman:0.5.3
```

## Step 3: Configure Helm Values

Edit `helm/proman/values.yaml`:

```yaml
image:
  repository: ghcr.io/yourusername/proman
  tag: "0.5.3"
  pullPolicy: IfNotPresent

replicaCount: 1

service:
  type: NodePort
  port: 3000
  targetPort: 3000
  nodePort: 30000  # Accessible at http://your-truenas-ip:30000

persistence:
  enabled: true
  storageClass: "default"  # TrueNAS storage class
  size: 10Gi
  mountPath: /app/data

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Environment variables from .env
env:
  NEXTAUTH_URL: https://your-domain.com
  SENDGRID_FROM_EMAIL: noreply@yourdomain.com
  NODE_ENV: production

# Secrets (configure separately or use sealed-secrets)
secrets:
  NEXTAUTH_SECRET: your-secret-here
  GOOGLE_ID: your-google-id
  GOOGLE_SECRET: your-google-secret
  SENDGRID_API_KEY: your-sendgrid-key
  SENDGRID_WEBHOOK_PUBLIC_KEY: your-webhook-key
  DATABASE_URL: file:./data/dev.db
```

## Step 4: Create Kubernetes Namespace

```bash
kubectl create namespace proman
kubectl label namespace proman name=proman
```

## Step 5: Create Secret for Environment Variables

```bash
kubectl create secret generic proman-secrets \
  --from-literal=NEXTAUTH_SECRET='your-secret' \
  --from-literal=GOOGLE_ID='your-id' \
  --from-literal=GOOGLE_SECRET='your-secret' \
  --from-literal=SENDGRID_API_KEY='your-key' \
  --from-literal=SENDGRID_WEBHOOK_PUBLIC_KEY='your-key' \
  --from-literal=DATABASE_URL='file:./data/dev.db' \
  -n proman
```

## Step 6: Deploy with Helm

```bash
# Install
helm install proman ./helm/proman \
  --namespace proman \
  --values ./helm/proman/values.yaml

# Or upgrade if already installed
helm upgrade proman ./helm/proman \
  --namespace proman \
  --values ./helm/proman/values.yaml
```

## Step 7: Verify Deployment

```bash
# Check pod status
kubectl get pods -n proman

# Check service
kubectl get svc -n proman

# View logs
kubectl logs -f deployment/proman -n proman

# Check health endpoint
curl http://your-truenas-ip:30000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-27T10:00:00Z"
}
```

## Step 8: Configure Domain and TLS (Optional)

If using TrueNAS's ingress controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: proman-ingress
  namespace: proman
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - proman.your-domain.com
    secretName: proman-tls
  rules:
  - host: proman.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: proman
            port:
              number: 3000
```

Apply with:
```bash
kubectl apply -f ingress.yaml
```

## Step 9: Configure SendGrid Webhooks

1. Log into SendGrid console
2. Go to Settings > Mail Send
3. Click "Event Webhook"
4. Set HTTP POST URL to: `https://your-domain.com/api/webhooks/sendgrid`
5. Enable events:
   - Delivered
   - Bounce
   - Opened
   - Clicked
   - Deferred
6. Copy the Public Key and add to `SENDGRID_WEBHOOK_PUBLIC_KEY`
7. Test webhook delivery

## Step 10: Initialize Database (First Time Only)

The database initializes automatically on first deployment. To manually initialize:

```bash
# Get pod name
POD=$(kubectl get pods -n proman -o jsonpath='{.items[0].metadata.name}')

# Run initialization
curl -X POST http://your-truenas-ip:30000/api/debug/db/init \
  -H "X-HMAC-Signature: your-signature"
```

**Note**: In production, debug endpoints are disabled. Database initializes automatically via Prisma migrations.

## Monitoring and Maintenance

### View Logs

```bash
# Current logs
kubectl logs deployment/proman -n proman

# Follow logs
kubectl logs -f deployment/proman -n proman

# Previous pod logs (if it crashed)
kubectl logs --previous deployment/proman -n proman
```

### Check Resource Usage

```bash
kubectl top pod -n proman
```

### Restart Application

```bash
kubectl rollout restart deployment/proman -n proman
```

### Update Application

```bash
# Edit values.yaml with new image tag
helm upgrade proman ./helm/proman \
  --namespace proman \
  --values ./helm/proman/values.yaml
```

### Database Backup

```bash
# Get database file from pod
kubectl exec -it deployment/proman -n proman -- tar czf - /app/data/dev.db | tar xzf - -O > backup.tar.gz

# Or copy directly
kubectl cp proman/proman-xxxxx:/app/data/dev.db ./dev.db.backup -n proman
```

### Database Restore

```bash
# Copy backup into pod
kubectl cp ./dev.db.backup proman/proman-xxxxx:/app/data/dev.db -n proman

# Restart pod
kubectl rollout restart deployment/proman -n proman
```

## Troubleshooting

### Pod not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n proman

# Check logs
kubectl logs <pod-name> -n proman

# Check resource limits
kubectl top pod <pod-name> -n proman
```

### Database connection issues

```bash
# Verify database file exists
kubectl exec deployment/proman -n proman -- ls -la /app/data/

# Check database file size (should be > 0)
kubectl exec deployment/proman -n proman -- du -h /app/data/dev.db
```

### Authentication stuck due to orphaned OAuth accounts

If Google sign-in reports `OAuthAccountNotLinked` or `Callback` errors because an old OAuth account still exists, run the cleanup script inside the pod:

```bash
kubectl exec -it deployment/proman -n proman -- /bin/sh -c "cd /app && USER_EMAIL='user@example.com' npm run user:delete"
```

Replace `user@example.com` with the email to remove. The script deletes the user, related sessions, and any orphaned OAuth account rows so the next login can recreate them cleanly.

### Health check failing

```bash
# Check health endpoint
kubectl port-forward svc/proman 3000:3000 -n proman
curl http://localhost:3000/api/health
```

### SendGrid webhooks not received

1. Verify endpoint URL is accessible from internet
2. Check webhook logs in SendGrid console
3. Verify public key matches in `SENDGRID_WEBHOOK_PUBLIC_KEY`
4. Check application logs for webhook errors:
   ```bash
   kubectl logs -f deployment/proman -n proman | grep webhook
   ```

### Running out of storage

```bash
# Check PVC usage
kubectl get pvc -n proman

# Describe PVC for details
kubectl describe pvc proman-data -n proman
```

## Security Notes

1. **Always use HTTPS in production** - Configure TLS via Ingress/cert-manager
2. **Rotate secrets regularly** - Update NEXTAUTH_SECRET and API keys quarterly
3. **Restrict network access** - Use NetworkPolicies to limit pod communication
4. **Keep images updated** - Rebuild with latest dependencies monthly
5. **Monitor logs** - Set up log aggregation (ELK, Datadog, etc.)
6. **Database encryption** - Consider encrypted storage class for PVC
7. **Backup strategy** - Automated daily backups of database

## Rollback Procedure

If deployment fails:

```bash
# View release history
helm history proman -n proman

# Rollback to previous version
helm rollback proman <revision> -n proman

# Example: rollback to revision 1
helm rollback proman 1 -n proman
```

## Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [TrueNAS Kubernetes Guide](https://www.truenas.com/docs/scale/scaletutorials/apps/)
- [Next.js Deployment](https://nextjs.org/docs/deployment/production-checklist)
- [Prisma Deployment](https://www.prisma.io/docs/orm/more/deployment)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review ProMan GitHub issues
3. Check TrueNAS community forums
4. Consult Kubernetes documentation
