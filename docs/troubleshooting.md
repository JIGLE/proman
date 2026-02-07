# Troubleshooting

Common issues and solutions when running ProMan.

## Application Won't Start

### `no such table: main.users`

The database file exists but the schema hasn't been applied.

**Solution:** Initialize the database:

```bash
# Via API endpoint (recommended)
curl -sS -X POST -H "Authorization: Bearer $INIT_SECRET" \
  http://localhost:3000/api/debug/db/init | jq

# Via Prisma CLI inside the container
kubectl exec -it <pod> -- npx prisma db push
kubectl exec -it <pod> -- npx prisma generate
```

### `EACCES: permission denied` on database file

The container user doesn't have write permissions to the data directory.

**Solution:**
- Ensure the volume is writable: `chmod 777 /data` on the host (or use `fsGroup` in k8s)
- Check `fsGroup` in your deployment spec matches the container user's group

```yaml
securityContext:
  fsGroup: 1001  # matches nextjs group in Dockerfile
```

### App starts but returns 500 errors

1. Check logs: `kubectl logs deployment/proman --tail=100`
2. Verify environment variables are set: `kubectl exec <pod> -- env | grep -E 'DATABASE|NEXTAUTH'`
3. Verify database tables exist: `kubectl exec <pod> -- sqlite3 /data/proman.sqlite '.tables'`

## Networking

### App running but unreachable externally

1. **NodePort:** Verify the node port is open:
   ```bash
   curl -v http://<node-ip>:<node-port>
   ```

2. **Port-forward** to test locally:
   ```bash
   kubectl port-forward svc/proman 3000:80 -n <namespace>
   curl http://localhost:3000
   ```

3. Check service configuration:
   ```bash
   kubectl get svc proman -o yaml
   kubectl describe endpoints proman
   ```

### NextAuth redirect errors

`NEXTAUTH_URL` must match the externally reachable URL (including protocol and port):

```bash
# Correct
NEXTAUTH_URL=https://proman.example.com

# Wrong (missing port for NodePort)
NEXTAUTH_URL=https://proman.example.com  # when using NodePort 30080
# Should be: http://<ip>:30080
```

## Docker

### Build fails on native modules (better-sqlite3)

The Dockerfile includes build dependencies (`python3 make g++ pkgconfig`). If building on a non-x86 platform:

```bash
# Ensure you're building for the right platform
docker buildx build --platform linux/amd64 -t proman:local .
```

### Container exits immediately

Check the logs:

```bash
docker logs <container-id>
```

Common causes:
- Missing required environment variables
- Database path not writable
- Port already in use

## Authentication

### Can't sign in

1. Verify `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set
2. If using Google OAuth, verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Check redirect URI in Google Cloud Console matches `NEXTAUTH_URL`

### Emergency: bypass DB for sign-in

**Not recommended for production.** Set temporarily to debug:

```bash
NEXTAUTH_ALLOW_DB_FAILURE=true
```

## Database

### Corrupt database

```bash
# Check integrity
sqlite3 /data/proman.sqlite "PRAGMA integrity_check;"

# If corrupt, restore from backup
bash scripts/db-backup.sh  # create current backup first
cp /backups/proman-<timestamp>.sqlite /data/proman.sqlite
```

### Reset database (development only)

```bash
RESET_DB=true npm run dev
```

## Performance

### Slow responses

1. Check database size: `ls -la /data/proman.sqlite`
2. Check available memory: `kubectl top pod <pod-name>`
3. Review resource limits in deployment spec
4. Consider upgrading to PostgreSQL for high-traffic deployments

## Getting Help

- Check existing docs: `docs/` directory
- Open an issue: https://github.com/JIGLE/proman/issues
- Review logs with structured JSON format for easier debugging
