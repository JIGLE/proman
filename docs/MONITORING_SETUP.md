# Monitoring and Alerting Setup

## Overview

This document outlines the monitoring and alerting infrastructure for ProMan production deployment.

## Health Check Endpoints

**Implementation Status**: ✅ IMPLEMENTED

All health check endpoints are now live and ready for external monitoring.

### `/api/health`

**Purpose**: Combined application health check with database and email status

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T22:00:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 12
    },
    "email": {
      "status": "configured",
      "provider": "sendgrid"
    }
  },
  "response_time_ms": 15
}
```

**Monitoring**: HTTP GET every 30s
- Expected: 200 OK
- Alert on: 3 consecutive failures OR response time > 5s
- UptimeRobot/Pingdom recommended

### `/api/health/db`

**Purpose**: Detailed database health with latency tracking

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-01T22:00:00.000Z",
  "database": {
    "type": "sqlite",
    "metrics": {
      "query_latency_ms": 10,
      "transaction_latency_ms": 18,
      "connection_status": "active"
    }
  },
  "response_time_ms": 22
}
```

**Monitoring**: HTTP GET every 60s
- Expected: 200 OK, query_latency_ms < 100ms
- Alert on: status !== "healthy" OR latency > 500ms
- Grafana/Prometheus for trend analysis

### `/api/health/email`

**Purpose**: Email service configuration verification

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-01T22:00:00.000Z",
  "provider": "sendgrid",
  "configured": true,
  "from_email": "noreply@proman.example",
  "response_time_ms": 2
}
```

**Monitoring**: HTTP GET every 300s (5 min)
- Expected: 200 OK, configured: true
- Alert on: configured: false

### `/api/metrics`

**Purpose**: Prometheus-compatible metrics endpoint

**Implementation Status**: ✅ IMPLEMENTED (in-memory metrics, resets on restart)

**Formats Supported**:
1. **Prometheus text format** (default): `Accept: text/plain`
2. **JSON format**: `Accept: application/json`

**Response (Prometheus format)**:
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 12450

# HELP http_errors_total Total HTTP errors (4xx, 5xx)
# TYPE http_errors_total counter
http_errors_total 23

# HELP db_queries_total Total database queries
# TYPE db_queries_total counter
db_queries_total 8901

# HELP email_sent_total Total emails sent successfully
# TYPE email_sent_total counter
email_sent_total 156

# HELP email_failed_total Total emails failed to send
# TYPE email_failed_total counter
email_failed_total 3

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds 3600.5
```

**Response (JSON format)**:
```json
{
  "metrics": {
    "http_requests_total": 12450,
    "http_errors_total": 23,
    "db_queries_total": 8901,
    "email_sent_total": 156,
    "email_failed_total": 3,
    "process_uptime_seconds": 3600.5,
    "metrics_reset_timestamp": "2026-02-01T20:00:00.000Z"
  },
  "note": "Metrics reset on application restart. For production, use persistent storage."
}
```

**Prometheus Configuration**:
```yaml
scrape_configs:
  - job_name: 'proman'
    scrape_interval: 15s
    static_configs:
      - targets: ['proman.example:3000']
    metrics_path: '/api/metrics'
```

**Note**: Current implementation stores metrics in-memory. For production with multiple instances, consider:
- Redis for centralized metrics storage
- Installing `prom-client` package for advanced metrics
- Application Performance Monitoring (APM) tools like Datadog, New Relic

## Key Metrics to Monitor

### Application Metrics

1. **Request Rate**
   - Metric: `http_requests_total`
   - Alert: Sudden drop > 50% (possible outage)
   - Alert: Spike > 300% (possible attack/bot traffic)

2. **Response Time (p95, p99)**
   - Metric: `http_request_duration_ms`
   - Alert: p95 > 1000ms OR p99 > 3000ms

3. **Error Rate**
   - Metric: `http_errors_total` (4xx, 5xx)
   - Alert: 5xx > 1% of requests
   - Alert: 4xx > 10% of requests

4. **Memory Usage**
   - Metric: `process_resident_memory_bytes`
   - Alert: > 80% of container limit
   - Alert: Growth rate > 100MB/hour (memory leak)

5. **CPU Usage**
   - Metric: `process_cpu_usage_percent`
   - Alert: > 80% for 5+ minutes

### Database Metrics

1. **Connection Pool**
   - Metric: `db_connections_active`, `db_connections_idle`
   - Alert: active > 90% of pool size
   - Alert: idle = 0 (connection exhaustion)

2. **Query Performance**
   - Metric: `db_query_duration_ms`
   - Alert: p95 > 500ms
   - Alert: Slow queries (> 2s) detected

3. **Database Size**
   - Metric: `db_size_bytes`
   - Alert: Growth > 1GB/day (investigate)
   - Alert: > 80% of allocated storage

### Email Metrics

1. **Send Rate**
   - Metric: `email_sent_total`
   - Alert: Approaching SendGrid daily limit (90% of 100/day on free tier)

2. **Delivery Rate**
   - Metric: `email_delivered_total / email_sent_total`
   - Alert: < 95% delivery rate

3. **Bounce Rate**
   - Metric: `email_bounced_total / email_sent_total`
   - Alert: > 5% bounce rate

4. **Retry Rate**
   - Metric: `email_retries_total`
   - Alert: > 20% of sends require retries

### Business Metrics

1. **New Properties**
   - Metric: `properties_created_total`
   - Alert: 0 new properties in 7 days (stale instance)

2. **Active Users (DAU)**
   - Metric: `active_users_daily`
   - Alert: Drop > 30% week-over-week

3. **Payment Processing**
   - Metric: `payments_processed_total`, `payments_failed_total`
   - Alert: Failure rate > 5%

## Logging Strategy

### Log Levels

```typescript
// Error: System failures, unhandled exceptions
logger.error('Database connection failed', { error, context })

// Warn: Recoverable issues, retry attempts
logger.warn('Email send retry attempt 2/3', { recipient, error })

// Info: Business events, important state changes
logger.info('Property created', { propertyId, userId })

// Debug: Development/troubleshooting (disabled in production)
logger.debug('Cache hit', { key, ttl })
```

### Structured Logging Format

```json
{
  "timestamp": "2026-02-01T22:00:00.000Z",
  "level": "error",
  "message": "API Error",
  "context": {
    "userId": "user_123",
    "endpoint": "/api/properties",
    "method": "POST",
    "statusCode": 500,
    "error": "Database connection timeout",
    "stack": "..."
  }
}
```

### Log Retention

- **Production**: 30 days
- **Staging**: 7 days
- **Development**: 1 day

### Critical Logs to Alert On

1. **Unhandled Exceptions**
   - Pattern: `level: "error"` + `message: "unhandled"` 
   - Action: Immediate page (potential data loss)

2. **Authentication Failures**
   - Pattern: `statusCode: 401` spike
   - Action: Alert (possible attack)

3. **Database Errors**
   - Pattern: `error: "ECONNREFUSED"` OR `"transaction timeout"`
   - Action: Page (service degradation)

4. **Payment Failures**
   - Pattern: `endpoint: "/api/payments"` + `statusCode: 500`
   - Action: Alert (revenue impact)

## Alerting Channels

### Severity Levels

1. **Critical (P1)** - Immediate page
   - Service completely down
   - Database unreachable
   - Data corruption detected
   - Payment processing broken

2. **High (P2)** - Alert within 15 minutes
   - Elevated error rates (> 5%)
   - Performance degradation (p99 > 5s)
   - Email delivery issues

3. **Medium (P3)** - Alert within 1 hour
   - High retry rates
   - Slow queries detected
   - Memory/CPU warnings

4. **Low (P4)** - Daily summary
   - Usage trends
   - Capacity planning metrics

### Notification Routes

```yaml
Critical (P1):
  - PagerDuty: immediate
  - Slack: #incidents
  - Email: oncall@team.com

High (P2):
  - Slack: #alerts
  - Email: team@company.com

Medium (P3):
  - Slack: #monitoring

Low (P4):
  - Email: daily-digest@team.com
```

## Monitoring Tools

### Recommended Stack

1. **Application Monitoring**: Sentry or DataDog
   - Error tracking
   - Performance monitoring
   - User session replay

2. **Infrastructure**: Prometheus + Grafana
   - Custom metrics collection
   - Dashboards
   - Alerting rules

3. **Uptime Monitoring**: UptimeRobot or Pingdom
   - External health checks
   - SSL certificate expiry

4. **Log Aggregation**: Logtail or Papertrail
   - Centralized logging
   - Search and filtering
   - Log-based alerts

### Free Tier Options

For early-stage deployment:

- **Sentry**: 5k errors/month free
- **UptimeRobot**: 50 monitors free
- **Logtail**: 1GB logs/month free
- **Grafana Cloud**: 10k series free

## Dashboard Templates

### Main Operations Dashboard

**Panels**:
1. Request rate (last 24h)
2. Error rate by endpoint
3. Response time percentiles (p50, p95, p99)
4. Database query performance
5. Email delivery metrics
6. Active users (current)

### Database Health Dashboard

**Panels**:
1. Connection pool usage
2. Query duration histogram
3. Slow queries (> 1s) count
4. Database size growth
5. Table sizes
6. Index usage statistics

### Email Service Dashboard

**Panels**:
1. Emails sent/delivered/bounced (hourly)
2. Retry rate trend
3. Template usage breakdown
4. SendGrid quota remaining
5. Delivery latency
6. Bounce/spam complaint rates

## Alert Runbooks

### Database Connection Failures

**Alert**: `db_connections_active = 0` OR `status: "error"`

**Steps**:
1. Check database service status: `kubectl get pods -n production`
2. Verify network connectivity: `nc -zv db-host 5432`
3. Check connection pool config: Max connections exceeded?
4. Review recent deployments: Schema migration issue?
5. Restart application pods if needed: `kubectl rollout restart deployment proman`

### High Error Rate (5xx)

**Alert**: `http_errors_5xx_total > 1%` for 5 minutes

**Steps**:
1. Check recent deployments: Bad release?
2. Review error logs: Common error pattern?
3. Check dependencies: Database, email service healthy?
4. Monitor resource usage: CPU/memory exhaustion?
5. Rollback if needed: `kubectl rollout undo deployment proman`

### Email Delivery Failure

**Alert**: `email_delivery_rate < 95%`

**Steps**:
1. Check SendGrid status: https://status.sendgrid.com/
2. Verify API key validity: Not expired/revoked?
3. Check bounce reasons: Invalid addresses? Spam flags?
4. Review retry logs: Temporary or permanent failures?
5. Pause bulk sends if quota issue

## Setup Instructions

### 1. Environment Variables

```bash
# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
ENABLE_METRICS=true
LOG_LEVEL=info

# Health checks
HEALTH_CHECK_DB_TIMEOUT_MS=5000
HEALTH_CHECK_CACHE_TTL=60000
```

### 2. Sentry Integration

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});
```

### 3. Prometheus Metrics Endpoint

```typescript
// app/api/metrics/route.ts
import { collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    headers: { 'Content-Type': register.contentType },
  });
}
```

### 4. UptimeRobot Configuration

**Monitors to create**:
1. Main site: `https://proman.app` (HTTP 200, every 5 min)
2. API health: `https://proman.app/api/health` (every 1 min)
3. DB health: `https://proman.app/api/health/db` (every 5 min)

## Testing Alerts

Before going live, test each critical alert:

```bash
# Trigger database alert (stop database container)
docker stop proman-db

# Trigger high error rate (deploy intentionally broken code)
# Simulate in staging first

# Trigger email failure (invalid API key)
SENDGRID_API_KEY=invalid npm start
```

Verify:
- Alert fires within expected timeframe
- Correct channels notified
- Runbook instructions are clear

## Post-Deployment Checklist

- [ ] Health check endpoints returning 200 OK
- [ ] Metrics endpoint accessible at `/api/metrics`
- [ ] Sentry receiving error events
- [ ] UptimeRobot monitors configured and active
- [ ] Alerting channels tested (Slack, email, PagerDuty)
- [ ] Dashboards created in Grafana/DataDog
- [ ] On-call rotation schedule published
- [ ] Runbooks documented and accessible
- [ ] Log retention policies configured
- [ ] Backup/restore procedures tested

## Next Steps

1. **Week 1**: Monitor baseline metrics, tune thresholds
2. **Week 2**: Add custom business metrics
3. **Month 1**: Review and refine alerting rules
4. **Ongoing**: Weekly metrics review meeting
