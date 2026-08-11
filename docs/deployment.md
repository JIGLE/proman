# Deployment Guide

This guide covers deploying Situs with Docker. TrueNAS SCALE has its own guide:
[truenas.md](truenas.md).

## Docker

### Build from source

```bash
docker build \
  --build-arg BUILD_VERSION="1.1.0" \
  --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" \
  --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t situs:local .
```

### Run

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/data/situs.sqlite \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -v situs-data:/data \
  situs:local
```

### Docker Compose

```bash
# Production profile (uses GHCR image)
docker-compose --profile prod up -d

# Development profile (builds from source)
docker-compose --profile dev up -d
```

## Environment Variables

See [.env.example](../.env.example) for the complete list. Key production variables:

| Variable          | Required    | Description                                                |
| ----------------- | ----------- | ---------------------------------------------------------- |
| `DATABASE_URL`    | Yes         | SQLite connection string (e.g., `file:/data/situs.sqlite`) |
| `NEXTAUTH_URL`    | Yes         | Public URL of the application                              |
| `NEXTAUTH_SECRET` | Yes         | Session signing secret (min 32 chars)                      |
| `NODE_ENV`        | Yes         | Set to `production`                                        |
| `INIT_SECRET`     | Recommended | Protects the DB init endpoint                              |

## Health Checks

The application exposes:

- `GET /api/health` — HTTP health check (used by Docker HEALTHCHECK, k8s probes)
- `GET /version.json` — Build metadata (version, git commit, build time)

## Persistent Storage

Situs requires a writable volume mounted at `/data` for:

- SQLite database file
- Release cache (`latest-release.json`)

Ensure `PERSISTENCE_MOUNT_PATH` matches the volume mount path.
