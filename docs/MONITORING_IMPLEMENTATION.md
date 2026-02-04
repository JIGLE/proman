# Error Logging and Monitoring Implementation

## Overview

Comprehensive production-ready monitoring and observability stack implemented across ProMan, providing error tracking, performance monitoring, and application metrics collection.

**Implementation Date**: February 4, 2026  
**Status**: ✅ Complete

---

## 🎯 What Was Implemented

### 1. Performance Monitoring (`lib/monitoring/performance.ts`)

**Purpose**: Track application performance metrics and Web Vitals

**Features**:
- ✅ **Performance Timer**: Measure operation duration with start/end
- ✅ **Async/Sync Wrappers**: `measureAsync()` and `measureSync()` decorators
- ✅ **Web Vitals Tracking**: LCP, FID, CLS (Core Web Vitals)
- ✅ **Page Load Metrics**: Total load time, DOM ready, first paint
- ✅ **Metrics Store**: Aggregates last 100 metrics with averages
- ✅ **Smart Logging**: Auto-log slow operations (API >1s, DB >500ms)

**Key Functions**:
```typescript
// Record a metric
recordMetric('api.users.get', 245, 'ms', { userId: '123' });

// Time an operation
const timer = new PerformanceTimer('db.query.users');
// ... perform operation
timer.end(true); // Records duration

// Measure async function
const result = await measureAsync('api.properties.fetch', async () => {
  return await fetchProperties();
});

// Track Web Vitals (client-side)
trackWebVitals(); // Auto-tracks LCP, FID, CLS
```

**Metrics Collected**:
- API response times
- Database query duration
- Page load performance
- Web Vitals scores (LCP <2.5s good, FID <100ms good, CLS <0.1 good)

---

### 2. Error Tracking (`lib/monitoring/error-tracker.ts`)

**Purpose**: Centralized error tracking with severity classification

**Features**:
- ✅ **Error Context Enrichment**: User, request, component, action metadata
- ✅ **Severity Classification**: Auto-categorize (low/medium/high/critical)
- ✅ **Error Store**: Keeps last 50 errors for debugging
- ✅ **External Service Integration**: Ready for Sentry, LogRocket
- ✅ **Error Filtering**: By component, severity, handled status
- ✅ **Statistics**: Error counts by severity/component

**Severity Rules**:
- **Critical**: Authentication, authorization, database errors
- **High**: API errors, validation failures in critical flows (payments)
- **Medium**: General validation, network/fetch errors
- **Low**: All other errors

**Key Functions**:
```typescript
// Track an error
trackError(new Error('Payment failed'), {
  user: { id: '123', email: 'user@example.com' },
  request: { url: '/api/payments', method: 'POST' },
  component: 'PaymentForm',
  action: 'processPayment',
  metadata: { amount: 500, currency: 'EUR' }
}, false); // false = unhandled

// Create reusable error handler
const handleError = createErrorHandler({
  component: 'PropertyList',
  user: { id: currentUser.id }
});
handleError(error); // Automatically includes base context

// Wrap async operations
await withErrorTracking(async () => {
  await riskyOperation();
}, { component: 'DataSync' });

// Get error statistics
const stats = getErrorStats();
// Returns: { total, bySeverity, byComponent, handled, unhandled }
```

**Integration Points**:
- **Sentry**: Auto-sends errors if `window.Sentry` detected
- **LogRocket**: Auto-sends if `window.LogRocket` detected
- **Custom Endpoint**: Use `NEXT_PUBLIC_MONITORING_ENDPOINT` env var

---

### 3. Application Metrics (`lib/monitoring/metrics.ts`)

**Purpose**: Business and system metrics collection

**Features**:
- ✅ **Counter Metrics**: Increment/decrement (user logins, API calls)
- ✅ **Gauge Metrics**: Current values (active connections, memory usage)
- ✅ **Histogram Metrics**: Distribution with percentiles (p50, p95, p99)
- ✅ **Prometheus Export**: Standard format for monitoring systems
- ✅ **Smart Logging**: Auto-log business-critical metrics
- ✅ **Helper Functions**: Pre-built for common metrics

**Metric Types**:

1. **Counters** (increment only, never decrease):
   ```typescript
   metrics.increment('user.login', 1, { userId: '123' });
   metrics.increment('api.request', 1, { endpoint: '/properties', method: 'GET' });
   ```

2. **Gauges** (current value at a point in time):
   ```typescript
   metrics.gauge('system.memory.used', 512, { unit: 'MB' });
   metrics.gauge('db.connections.active', 5);
   ```

3. **Histograms** (track distribution of values):
   ```typescript
   metrics.histogram('api.response_time', 245, { endpoint: '/tenants' });
   // Auto-calculates: min, max, avg, p50, p95, p99
   ```

**Pre-built Helpers**:
```typescript
// User metrics
userMetrics.login(userId);
userMetrics.logout(userId);
userMetrics.signUp();

// Property metrics
propertyMetrics.created(userId);
propertyMetrics.updated(userId);
propertyMetrics.deleted(userId);

// Tenant metrics
tenantMetrics.added(propertyId);
tenantMetrics.removed(propertyId);

// API metrics
apiMetrics.request('/properties', 'GET');
apiMetrics.success('/properties', 'GET');
apiMetrics.error('/properties', 'POST', '500');
apiMetrics.responseTime('/properties', 234);

// Database metrics
dbMetrics.query('Property', 'findMany');
dbMetrics.queryTime('Property', 123);
dbMetrics.error('Property', 'create');
```

**Prometheus Export**:
```typescript
const prometheusFormat = metrics.exportPrometheus();
// Output:
// # TYPE user_login counter
// user_login 142
// # TYPE api_response_time histogram
// api_response_time_count 500
// api_response_time_sum 125000
// api_response_time{quantile="0.95"} 450
```

---

### 4. API Monitoring Middleware (`lib/middleware/monitoring.ts`)

**Purpose**: Automatic API request/response tracking

**Features**:
- ✅ **Auto-timing**: Records API response time
- ✅ **Success/Error Tracking**: Increments counters
- ✅ **Request Logging**: With context (route, method, user agent)
- ✅ **Error Tracking**: Auto-tracks API errors
- ✅ **Route Pattern Extraction**: Normalizes `/api/properties/123` → `/properties/:id`

**Usage**:
```typescript
// Wrap your API handler
import { withMonitoring } from '@/lib/middleware/monitoring';

export const GET = withMonitoring(async (request: NextRequest) => {
  // Your handler code
  const data = await fetchData();
  return NextResponse.json(data);
});

// Or create custom middleware
const loggerMiddleware = createMonitoringMiddleware('users.create', {
  logBody: true,    // Log request body
  logHeaders: true, // Log headers
});
```

**What It Tracks**:
- Request count per endpoint
- Success/error rates by endpoint
- Response time percentiles
- Error details with full context

---

### 5. Updated Error Boundary (`components/shared/error-boundary.tsx`)

**Changes**:
- ✅ **Auto-tracking**: Errors caught by boundary automatically tracked
- ✅ **Error IDs**: Displays unique error ID for support
- ✅ **Component Context**: Accepts `component` prop for categorization
- ✅ **Enhanced Hook**: `useErrorHandler()` now tracks errors

**Usage**:
```tsx
<ErrorBoundary component="PropertyList">
  <PropertyListContent />
</ErrorBoundary>

// Or use the hook
const handleError = useErrorHandler('PaymentForm');
try {
  await processPayment();
} catch (error) {
  handleError(error);
}
```

---

### 6. Monitoring API Endpoints

#### **GET /api/monitoring/metrics**
Returns application metrics in JSON or Prometheus format

**Parameters**:
- `format`: `json` (default) or `prometheus`

**Response (JSON)**:
```json
{
  "timestamp": "2026-02-04T10:30:00.000Z",
  "metrics": {
    "application": [...],
    "counters": { "user.login": 142, "api.request": 5234 },
    "gauges": { "db.connections.active": 5 }
  },
  "performance": {
    "metrics": [...],
    "timings": [...],
    "averages": { "api.properties.get": 234.5 }
  }
}
```

**Prometheus Format**:
```
GET /api/monitoring/metrics?format=prometheus

# TYPE user_login counter
user_login 142
# TYPE api_request counter
api_request 5234
```

#### **GET /api/monitoring/health**
Health check endpoint for load balancers

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-04T10:30:00.000Z",
  "uptime": 3600.5,
  "checks": {
    "database": "healthy",
    "memory": "healthy"
  },
  "memoryUsage": {
    "heapUsed": "45.23 MB",
    "heapTotal": "128.00 MB",
    "percentage": "35.34%"
  }
}
```

**Status Codes**:
- `200`: All checks healthy
- `503`: One or more checks unhealthy

#### **GET /api/monitoring/errors**
Recent errors (development only)

**Parameters**:
- `count`: Number of errors to return (default: 10)
- `stats`: `true` to return only statistics

**Response**:
```json
{
  "timestamp": "2026-02-04T10:30:00.000Z",
  "count": 10,
  "stats": {
    "total": 45,
    "bySeverity": { "critical": 2, "high": 8, "medium": 20, "low": 15 },
    "byComponent": { "PropertyForm": 12, "TenantList": 8 },
    "handled": 35,
    "unhandled": 10
  },
  "errors": [...]
}
```

---

### 7. Web Vitals Tracker Component (`components/monitoring/web-vitals-tracker.tsx`)

**Purpose**: Client-side Web Vitals tracking

**Usage**:
```tsx
// In app/layout.tsx
import { WebVitalsTracker } from '@/components/monitoring/web-vitals-tracker';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitalsTracker />
        {children}
      </body>
    </html>
  );
}
```

**Metrics Tracked**:
- **LCP** (Largest Contentful Paint): <2.5s good
- **FID** (First Input Delay): <100ms good
- **CLS** (Cumulative Layout Shift): <0.1 good
- Page load times (total, DOM ready, first paint)

---

## 🔧 Integration Guide

### Step 1: Add Web Vitals Tracking to Layout

```tsx
// app/layout.tsx
import { WebVitalsTracker } from '@/components/monitoring/web-vitals-tracker';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitalsTracker />
        {children}
      </body>
    </html>
  );
}
```

### Step 2: Wrap API Routes with Monitoring

```typescript
// app/api/properties/route.ts
import { withMonitoring } from '@/lib/middleware/monitoring';
import { withErrorHandler } from '@/lib/utils/error-handling';

export const GET = withMonitoring(
  withErrorHandler(async (request: NextRequest) => {
    // Your handler code
    const properties = await prisma.property.findMany();
    return NextResponse.json({ data: properties });
  })
);
```

### Step 3: Track Business Metrics

```typescript
// In your service/handler code
import { propertyMetrics, userMetrics } from '@/lib/monitoring/metrics';

async function createProperty(data: PropertyData, userId: string) {
  const property = await prisma.property.create({ data });
  
  // Track the business event
  propertyMetrics.created(userId);
  
  return property;
}

async function login(credentials: Credentials) {
  const user = await authenticate(credentials);
  
  // Track login
  userMetrics.login(user.id);
  
  return user;
}
```

### Step 4: Track Performance

```typescript
// Wrap expensive operations
import { measureAsync, PerformanceTimer } from '@/lib/monitoring/performance';

// Option 1: Wrapper function
const data = await measureAsync('complex.calculation', async () => {
  return await complexCalculation();
}, { userId: '123' });

// Option 2: Manual timer
const timer = new PerformanceTimer('data.export');
try {
  const result = await exportData();
  timer.end(true);
  return result;
} catch (error) {
  timer.end(false, error.message);
  throw error;
}
```

### Step 5: Add Error Boundaries

```tsx
// Around error-prone components
import { ErrorBoundary } from '@/shared';

export default function Page() {
  return (
    <ErrorBoundary component="PropertyDashboard">
      <PropertyDashboard />
    </ErrorBoundary>
  );
}
```

---

## 📊 Monitoring Services Integration

### Sentry Setup

1. **Install Sentry**:
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize**:
   ```typescript
   // app/layout.tsx or instrumentation.ts
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });
   ```

3. **Errors Auto-sent**: `error-tracker.ts` automatically sends to Sentry when `window.Sentry` is detected

### LogRocket Setup

1. **Install LogRocket**:
   ```bash
   npm install logrocket
   ```

2. **Initialize**:
   ```typescript
   // app/layout.tsx
   import LogRocket from 'logrocket';

   if (process.env.NODE_ENV === 'production') {
     LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID);
   }
   ```

3. **Errors Auto-sent**: `error-tracker.ts` automatically sends to LogRocket

### Custom Monitoring Endpoint

Set environment variable:
```env
NEXT_PUBLIC_MONITORING_ENDPOINT=https://your-monitoring-service.com/api/errors
```

Errors will be POSTed as JSON to this endpoint.

---

## 🎛️ Environment Variables

```env
# Logging
LOG_LEVEL=info                    # debug|info|warn|error (default: warn in prod, debug in dev)
DEBUG=true                        # Enable debug logs in production

# Monitoring Services
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_LOGROCKET_APP_ID=abc123
NEXT_PUBLIC_MONITORING_ENDPOINT=https://monitoring.example.com/api/errors
```

---

## 📈 Accessing Metrics

### Development

1. **Metrics Dashboard**:
   ```
   GET http://localhost:3000/api/monitoring/metrics
   ```

2. **Health Check**:
   ```
   GET http://localhost:3000/api/monitoring/health
   ```

3. **Recent Errors**:
   ```
   GET http://localhost:3000/api/monitoring/errors?count=20
   ```

4. **Error Statistics**:
   ```
   GET http://localhost:3000/api/monitoring/errors?stats=true
   ```

### Production

1. **Prometheus Scraping**:
   ```
   GET https://your-app.com/api/monitoring/metrics?format=prometheus
   ```
   
   Configure Prometheus to scrape this endpoint every 15s

2. **Health Check**:
   Use for load balancer health checks:
   ```
   GET https://your-app.com/api/monitoring/health
   ```

3. **Grafana Dashboards**:
   - Import Prometheus metrics
   - Create dashboards for API response times, error rates, Web Vitals

---

## 🧪 Testing the Implementation

```typescript
// Test performance tracking
import { PerformanceTimer, getMetrics } from '@/lib/monitoring/performance';

const timer = new PerformanceTimer('test.operation');
// ... do something
timer.end(true);

const metrics = getMetrics();
console.log(metrics.averages['test.operation']); // Average duration

// Test error tracking
import { trackError, getRecentErrors } from '@/lib/monitoring/error-tracker';

trackError(new Error('Test error'), {
  component: 'TestComponent',
  severity: 'medium'
});

const errors = getRecentErrors(5);
console.log(errors); // Last 5 errors

// Test metrics
import { metrics } from '@/lib/monitoring/metrics';

metrics.increment('test.counter');
metrics.gauge('test.gauge', 42);
metrics.histogram('test.histogram', 123);

console.log(metrics.getCounters());
console.log(metrics.getGauges());
```

---

## 🚨 Alerts and Notifications

### Recommended Alert Rules

1. **High Error Rate**:
   - Alert if error rate > 5% of total requests
   - Query: `rate(api_error[5m]) / rate(api_request[5m]) > 0.05`

2. **Slow API Response**:
   - Alert if p95 response time > 2s
   - Query: `api_response_time{quantile="0.95"} > 2000`

3. **Database Health**:
   - Alert if database check fails
   - Endpoint: `/api/monitoring/health`

4. **Memory Usage**:
   - Alert if heap usage > 90%
   - Query: Memory percentage from health endpoint

5. **Critical Errors**:
   - Alert on any critical severity error
   - Track: `trackError()` with severity='critical'

---

## 📋 Production Checklist

- [x] Performance monitoring implemented
- [x] Error tracking with severity classification
- [x] Application metrics collection
- [x] API monitoring middleware
- [x] Error boundaries updated
- [x] Web Vitals tracking (client-side)
- [x] Health check endpoint
- [x] Metrics endpoint (JSON + Prometheus)
- [x] Errors endpoint (development)
- [ ] Sentry/LogRocket integration (optional)
- [ ] Prometheus scraping configured
- [ ] Grafana dashboards created
- [ ] Alert rules configured
- [ ] On-call rotation setup

---

## 🎯 Next Steps

1. **Configure Monitoring Service** (optional):
   - Set up Sentry or LogRocket account
   - Add DSN to environment variables
   - Test error reporting

2. **Set Up Prometheus + Grafana** (recommended):
   - Configure Prometheus to scrape `/api/monitoring/metrics?format=prometheus`
   - Create Grafana dashboards for key metrics
   - Set up alert rules

3. **Add Custom Metrics**:
   - Identify business-critical events
   - Add metric tracking using helpers
   - Monitor trends over time

4. **Configure Alerts**:
   - Set up PagerDuty/Opsgenie integration
   - Define alert thresholds
   - Test alert delivery

5. **Load Testing** (next task):
   - Validate monitoring under load
   - Ensure metrics are accurate
   - Test error tracking with failures

---

## 📚 Related Documentation

- `REDIS_RATE_LIMITING.md` - Rate limiting with distributed storage
- `CSP_NONCE_IMPLEMENTATION.md` - Content Security Policy setup
- `CSRF_INTEGRATION.md` - CSRF protection

---

**Status**: ✅ Production-ready monitoring and observability infrastructure complete
