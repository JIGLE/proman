# Metrics & Monitoring Guide

This document describes how to instrument and monitor ProMan in production.

## Structured Logging

ProMan includes a structured JSON logger at `lib/utils/logger.ts`.

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Minimum log level: `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | — | `production` → JSON output; otherwise → colored text |

### Usage

```typescript
import { logger } from '@/lib/utils/logger'

// Basic logging
logger.info('Request received', { path: '/api/health', method: 'GET' })
logger.error('Database error', { error: err.message })

// Child logger with request context
const reqLogger = logger.child({ requestId: 'abc-123', userId: 'user-1' })
reqLogger.info('Processing payment')  // includes requestId & userId
```

### JSON output (production)

```json
{"timestamp":"2026-02-08T12:00:00.000Z","level":"info","message":"Request received","path":"/api/health","method":"GET"}
```

## Graceful Shutdown

ProMan includes a shutdown handler at `lib/utils/graceful-shutdown.ts` for custom server setups.

```typescript
import { registerShutdownHandlers, onShutdown } from '@/lib/utils/graceful-shutdown'

// Register additional cleanup
onShutdown(async () => {
  await prisma.$disconnect()
})

// Register with HTTP server
registerShutdownHandlers(server)
```

## Prometheus Metrics (Optional)

For production deployments, consider adding Prometheus metrics via `prom-client`:

### Quick setup

```bash
npm install prom-client
```

```typescript
// lib/metrics.ts
import client from 'prom-client'

// Collect default Node.js metrics (CPU, memory, event loop)
client.collectDefaultMetrics({ prefix: 'proman_' })

// Custom counters
export const httpRequestsTotal = new client.Counter({
  name: 'proman_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
})

export const httpRequestDuration = new client.Histogram({
  name: 'proman_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
})
```

### Expose metrics endpoint

Create `app/api/metrics/route.ts`:

```typescript
import client from 'prom-client'
import { NextResponse } from 'next/server'

export async function GET() {
  const metrics = await client.register.metrics()
  return new NextResponse(metrics, {
    headers: { 'Content-Type': client.register.contentType },
  })
}
```

### Example alert rules (Prometheus/Alertmanager)

```yaml
groups:
  - name: proman
    rules:
      - alert: HighErrorRate
        expr: rate(proman_http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High 5xx error rate on ProMan"

      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(proman_http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile response time above 2s"
```

### Grafana dashboard

Import a standard Node.js dashboard (e.g., Grafana ID `11159`) and add ProMan-specific panels for:
- `proman_http_requests_total` (rate by status code)
- `proman_http_request_duration_seconds` (latency percentiles)
- Default Node.js metrics (heap, CPU, event loop lag)

## Centralized Logging

For production, pipe JSON logs to a centralized system:

| Stack | Setup |
|-------|-------|
| **ELK** | Filebeat sidecar or stdout → Logstash → Elasticsearch |
| **Datadog** | Datadog Agent with Docker/K8s log collection |
| **Loki** | Promtail sidecar → Loki → Grafana |

Example k8s annotation for Datadog:

```yaml
metadata:
  annotations:
    ad.datadoghq.com/proman.logs: '[{"source":"nodejs","service":"proman"}]'
```
