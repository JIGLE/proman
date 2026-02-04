# Load Testing Implementation

## Overview

Comprehensive load testing infrastructure for ProMan using Artillery, enabling performance validation under realistic production-like conditions.

**Implementation Date**: February 4, 2026  
**Status**: ✅ Complete

---

## 🎯 What Was Implemented

### 1. Artillery Load Test Configuration (`load-tests/artillery.yml`)

**Purpose**: Realistic load testing scenarios with multiple user flows

**Load Phases**:
1. **Warm-up** (1 min): Ramp 1→10 users/sec
2. **Sustained Load** (3 min): 25 users/sec
3. **Peak Load** (2 min): Ramp 25→50 users/sec
4. **Cool-down** (1 min): Ramp 50→10 users/sec

**Total Duration**: ~7 minutes

**Performance Thresholds**:
- p95 response time: <2000ms
- p99 response time: <5000ms
- Error rate: <1%

**Test Scenarios**:

1. **Browse Public Pages** (30% weight)
   - Homepage visit
   - Health check endpoint
   - Think time: 2 seconds

2. **User Login and Dashboard** (40% weight)
   - Visit login page
   - Attempt authentication
   - Think time: 3 seconds

3. **Browse Properties** (20% weight)
   - List all properties
   - View specific property details
   - Think time: 2 seconds

4. **Monitoring Endpoints** (5% weight)
   - Metrics endpoint
   - Health check
   - Think time: 1 second

5. **Search Properties** (5% weight)
   - Search with filters
   - Pagination testing
   - Think time: 2 seconds

**Realistic User Behavior**:
- Think times between requests (1-3 seconds)
- Weighted scenarios (common flows get more traffic)
- CSV data for parameterization

---

### 2. Load Test Runner (`scripts/load-test.js`)

**Purpose**: Automated load testing with analysis

**Features**:
- ✅ **Prerequisite Checks**: Verifies Artillery and app running
- ✅ **Smoke Test**: Quick 10-second validation (5 users)
- ✅ **Full Load Test**: Complete 7-minute scenario suite
- ✅ **HTML Reports**: Auto-generates visual reports
- ✅ **Performance Analysis**: Detailed metrics breakdown
- ✅ **Pass/Fail Verdicts**: Based on performance thresholds

**Usage**:
```bash
# Smoke test (quick validation)
npm run load:smoke

# Full load test
npm run load:test

# Custom target
TARGET_URL=https://staging.proman.com npm run load:test
```

**Output Example**:
```
🚀 ProMan Load Testing Suite
Target: http://localhost:3000
Test Type: full

APPLICATION CHECK
✓ Application is running at http://localhost:3000

FULL LOAD TEST - Realistic Scenarios
Running full load test with Artillery...
This will take approximately 7 minutes
...

LOAD TEST ANALYSIS
Performance Metrics:
  Total Requests: 8450
  Successful: 8423
  Failed: 27

Response Times:
  Min: 12 ms
  Max: 3456 ms
  Median (p50): 145 ms
  p95: 890 ms
  p99: 2134 ms

Throughput:
  Requests/sec: 19.8

Performance Verdict:
✓ EXCELLENT - All metrics within targets

Targets:
  p95 < 2000ms: ✓
  p99 < 5000ms: ✓
  Error rate < 1%: ✓
```

---

### 3. Stress Test Runner (`scripts/stress-test.js`)

**Purpose**: Find system breaking points through gradual load increase

**Features**:
- ✅ **Progressive Load**: Ramps from 10→300 requests/sec
- ✅ **Breaking Point Detection**: Identifies when system fails
- ✅ **Limit Analysis**: Shows max throughput and error thresholds
- ✅ **Scaling Recommendations**: Suggests infrastructure improvements

**Load Phases**:
1. Ramp 10→50 req/sec (1 min)
2. Ramp 50→100 req/sec (1 min)
3. Ramp 100→200 req/sec (1 min)
4. Ramp 200→300 req/sec (1 min)

**Total Duration**: 4 minutes

**Usage**:
```bash
npm run load:stress
```

**Output Example**:
```
💪 ProMan Stress Testing
Target: http://localhost:3000
Finding system breaking points...

STRESS TEST ANALYSIS
System Limits:
  Total Requests: 42000
  Successful: 41234
  Errors: 766
  Error Rate: 1.82%

Response Times at Peak:
  Median: 567 ms
  p95: 3421 ms
  p99: 8934 ms
  Max: 15234 ms

Throughput:
  Max Requests/sec: 287

Recommendations:
  ⚠ Moderate error rate
    - Monitor in production
    - Consider auto-scaling triggers
  ⚠ Very high latency at peak
    - Review database query optimization
    - Consider caching strategies
```

---

### 4. Test Data (`load-tests/test-data.csv`)

**Purpose**: Parameterized data for realistic testing

**Contents**:
- User credentials (10 test users)
- Property names for creation tests
- CSV format for Artillery consumption

**Usage in Tests**:
```yaml
payload:
  path: "test-data.csv"
  fields:
    - "email"
    - "password"
    - "propertyName"
  order: "sequence"
```

---

### 5. NPM Scripts

Added to `package.json`:

```json
{
  "scripts": {
    "load:smoke": "node scripts/load-test.js smoke",
    "load:test": "node scripts/load-test.js full",
    "load:stress": "node scripts/stress-test.js"
  }
}
```

**Script Descriptions**:
- **load:smoke**: Quick 10-second smoke test (5 users)
- **load:test**: Full 7-minute load test with realistic scenarios
- **load:stress**: 4-minute stress test finding breaking points

---

### 6. Dependencies

Added to `package.json`:

```json
{
  "devDependencies": {
    "artillery": "^2.0.20",
    "js-yaml": "^4.1.0"
  }
}
```

**Artillery**: Industry-standard load testing framework  
**js-yaml**: YAML configuration generation for stress tests

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies (if not already installed)
npm install
```

Artillery and js-yaml are now in devDependencies and will be installed automatically.

### Running Tests

**1. Smoke Test** (Quick Validation)
```bash
# Start your application
npm run dev

# In another terminal, run smoke test
npm run load:smoke
```

Duration: ~10 seconds  
Purpose: Verify basic functionality

**2. Load Test** (Realistic Scenarios)
```bash
# Start your application
npm run dev  # or npm start for production mode

# Run full load test
npm run load:test
```

Duration: ~7 minutes  
Purpose: Validate performance under realistic load

**3. Stress Test** (Find Limits)
```bash
# Start your application
npm run dev

# Run stress test
npm run load:stress
```

Duration: ~4 minutes  
Purpose: Find system breaking points

### Custom Target URL

```bash
# Test against staging environment
TARGET_URL=https://staging.proman.com npm run load:test

# Test against production (use with caution!)
TARGET_URL=https://proman.com npm run load:test
```

---

## 📊 Understanding Results

### Key Metrics

**Response Time Percentiles**:
- **p50 (Median)**: 50% of requests faster than this
- **p95**: 95% of requests faster than this (target: <2000ms)
- **p99**: 99% of requests faster than this (target: <5000ms)

**Targets**:
- ✅ **Excellent**: p95 <2s, p99 <5s, errors <1%
- ⚠ **Acceptable**: p95 <3s, p99 <7s, errors <5%
- ❌ **Poor**: Above acceptable thresholds

**Throughput**:
- Requests/second the system can handle
- Higher is better
- Use for capacity planning

**Error Rate**:
- Percentage of failed requests
- Target: <1%
- Includes 500, 502, 503 errors

### Reports

**JSON Reports**: `load-tests/reports/load-test-*.json`
- Raw data for analysis
- Can be processed by CI/CD
- Includes all metrics

**HTML Reports**: `load-tests/reports/load-test-*.html`
- Visual charts and graphs
- Easy to share with team
- Auto-generated after each test

### Sample Report Structure

```json
{
  "aggregate": {
    "counters": {
      "vusers.created": 8450,
      "http.codes.200": 8423,
      "http.codes.500": 27
    },
    "latency": {
      "min": 12,
      "max": 3456,
      "median": 145,
      "p95": 890,
      "p99": 2134
    },
    "rates": {
      "http.request_rate": 19.8
    }
  }
}
```

---

## 🔧 Customization

### Modify Load Phases

Edit `load-tests/artillery.yml`:

```yaml
phases:
  # Custom phase: 100 users/sec for 5 minutes
  - duration: 300
    arrivalRate: 100
    name: "Heavy sustained load"
```

### Add New Scenarios

```yaml
scenarios:
  - name: "Create property flow"
    weight: 10  # 10% of traffic
    flow:
      - post:
          url: "/api/properties"
          json:
            name: "{{ propertyName }}"
            address: "123 Test St"
          expect:
            - statusCode: [200, 201]
      
      - think: 2
```

### Adjust Performance Thresholds

```yaml
ensure:
  # Stricter thresholds
  p95: 1000   # 1 second
  p99: 2000   # 2 seconds
  maxErrorRate: 0.5  # 0.5%
```

### Add Authentication

For authenticated endpoints, capture session tokens:

```yaml
flow:
  - post:
      url: "/api/auth/login"
      json:
        email: "{{ email }}"
        password: "{{ password }}"
      capture:
        - json: "$.token"
          as: "authToken"
  
  - get:
      url: "/api/properties"
      headers:
        Authorization: "Bearer {{ authToken }}"
```

---

## 📈 Performance Baselines

### Expected Performance (Development Mode)

**Smoke Test** (5 concurrent users):
- p95: 150-300ms
- p99: 300-500ms
- Error rate: 0%

**Load Test** (25-50 concurrent users):
- p95: 800-1500ms
- p99: 1500-3000ms
- Error rate: <1%
- Throughput: 15-25 req/sec

**Stress Test** (up to 300 req/sec):
- Breaking point: ~150-200 req/sec (SQLite limitation)
- Error rate at peak: 5-10%
- p99 at peak: 5000-10000ms

### Expected Performance (Production Mode)

**Load Test** (25-50 concurrent users):
- p95: 400-800ms (2x faster than dev)
- p99: 800-1500ms
- Error rate: <0.5%
- Throughput: 30-50 req/sec

**Stress Test** (with PostgreSQL/MySQL):
- Breaking point: ~500+ req/sec
- Error rate at peak: <5%
- p99 at peak: 2000-5000ms

---

## 🎯 Best Practices

### Before Load Testing

1. **Use Production Build**:
   ```bash
   npm run build
   npm start  # Not npm run dev
   ```

2. **Match Production Environment**:
   - Same database (PostgreSQL/MySQL vs SQLite)
   - Same hardware specs
   - Enable Redis rate limiting

3. **Warm Up Database**:
   - Seed with realistic data volume
   - Run migrations
   - Create indexes

4. **Monitor Resources**:
   ```bash
   # Watch CPU/Memory
   npm run load:test
   # In another terminal:
   top  # or htop on Linux/Mac
   ```

### During Load Testing

1. **Monitor Application**:
   - Watch logs for errors
   - Check `/api/monitoring/health`
   - Monitor database connections

2. **Observe Metrics**:
   ```bash
   # Real-time metrics
   curl http://localhost:3000/api/monitoring/metrics
   ```

3. **Note Anomalies**:
   - Sudden error spikes
   - Memory leaks
   - Connection pool exhaustion

### After Load Testing

1. **Review Reports**:
   - Check HTML report visuals
   - Analyze error patterns
   - Identify slow endpoints

2. **Compare Baselines**:
   - Track improvements over time
   - Ensure no regression
   - Document changes

3. **Take Action**:
   - Optimize slow queries
   - Add caching where needed
   - Configure auto-scaling

---

## 🚨 Common Issues & Solutions

### Issue: High Error Rate

**Symptoms**:
- Error rate >5%
- Many 500/502/503 responses

**Solutions**:
```bash
# Check rate limiting
# Increase limits in lib/middleware/rate-limit.ts

# Check database connections
# Increase pool size in prisma/schema.prisma

# Check memory
# Monitor with: npm run load:test & top
```

### Issue: Slow Response Times

**Symptoms**:
- p95 >2000ms
- p99 >5000ms

**Solutions**:
1. **Enable Query Logging**:
   ```typescript
   // In prisma client
   log: ['query', 'info', 'warn', 'error']
   ```

2. **Add Indexes**:
   - Check slow queries
   - Add database indexes
   - Run `npm run prisma:migrate`

3. **Add Caching**:
   - Cache frequently accessed data
   - Use Redis for session storage
   - Implement HTTP caching headers

### Issue: Memory Leaks

**Symptoms**:
- Memory usage grows over time
- Process crashes during test

**Solutions**:
```bash
# Enable memory monitoring
node --trace-warnings --max-old-space-size=4096 scripts/load-test.js

# Check for unclosed connections
# Review database connection handling
# Ensure proper cleanup in API routes
```

### Issue: Database Lock Errors (SQLite)

**Symptoms**:
- "database is locked" errors
- High error rate in stress test

**Solutions**:
1. **SQLite Limitations**:
   - SQLite doesn't handle high concurrency well
   - Expected behavior for stress tests

2. **Production Solution**:
   - Use PostgreSQL or MySQL
   - Configure connection pooling
   - Enable read replicas

---

## 📋 Load Testing Checklist

Before running load tests:

- [ ] Application built in production mode (`npm run build`)
- [ ] Database seeded with realistic data
- [ ] All migrations applied
- [ ] Performance indexes created (26 indexes from Week 1)
- [ ] Rate limiting configured
- [ ] Redis running (if using distributed rate limiting)
- [ ] Monitoring endpoints accessible
- [ ] Sufficient system resources (CPU, RAM, disk)
- [ ] No other heavy processes running
- [ ] Test environment matches production specs

After load tests:

- [ ] Review all reports (JSON + HTML)
- [ ] Compare against baseline metrics
- [ ] Check error logs for anomalies
- [ ] Verify no memory leaks
- [ ] Document performance improvements
- [ ] Update performance baselines
- [ ] Share results with team
- [ ] Create optimization tickets if needed

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow (Optional)

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Test

on:
  workflow_dispatch:  # Manual trigger only
    inputs:
      target_url:
        description: 'Target URL to test'
        required: true
        default: 'https://staging.proman.com'

jobs:
  load-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run load test
        env:
          TARGET_URL: ${{ github.event.inputs.target_url }}
        run: npm run load:test
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-reports
          path: load-tests/reports/
          retention-days: 30
```

---

## 📚 Additional Resources

**Artillery Documentation**:
- [Getting Started](https://www.artillery.io/docs/get-started)
- [Test Script Reference](https://www.artillery.io/docs/reference)
- [Plugins](https://www.artillery.io/docs/plugins)

**Performance Testing**:
- [Web Performance Optimization](https://web.dev/performance/)
- [Database Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

**Load Testing Best Practices**:
- [Google SRE Book - Load Testing](https://sre.google/sre-book/load-balancing-frontend/)
- [Microsoft - Performance Testing Guidance](https://learn.microsoft.com/en-us/azure/architecture/framework/scalability/performance-test)

---

## 🎯 Next Steps

1. **Run Initial Baseline**:
   ```bash
   npm run load:test
   # Save results as baseline
   ```

2. **Optimize Based on Results**:
   - Address slow endpoints
   - Add caching
   - Optimize queries

3. **Retest After Changes**:
   ```bash
   npm run load:test
   # Compare with baseline
   ```

4. **Set Up Monitoring**:
   - Configure alerts for p95/p99
   - Track error rates
   - Monitor throughput

5. **Production Deployment** (final task):
   - Use load test results for capacity planning
   - Configure auto-scaling based on metrics
   - Set up production monitoring

---

**Status**: ✅ Load testing infrastructure complete and ready for performance validation
