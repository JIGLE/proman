# Redis Rate Limiting Implementation

## Overview

ProMan now supports **distributed rate limiting with Redis** for production deployments. This enables horizontal scaling with consistent rate limits across multiple server instances.

## Architecture

### Store Selection (Automatic)

```typescript
// Auto-selects based on environment
const store = getRateLimitStore();

// Development: In-memory store (single instance)
// Production + REDIS_URL: Redis store (distributed)
```

**Selection Logic**:
- ✅ **Production + `REDIS_URL` set**: Use Redis for distributed rate limiting
- ✅ **Development or no `REDIS_URL`**: Use in-memory store for simplicity

### Store Implementations

#### 1. Memory Store (Development)
**File**: [lib/middleware/rate-limit-store.ts](lib/middleware/rate-limit-store.ts) - `MemoryRateLimitStore`

```typescript
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  // Auto-cleanup expired entries every 5 minutes
}
```

**Features**:
- Simple Map-based storage
- Automatic cleanup of expired entries
- Zero external dependencies
- Perfect for single-instance deployments

**Limitations**:
- ❌ Not shared across instances
- ❌ Lost on server restart
- ❌ Cannot scale horizontally

#### 2. Redis Store (Production)
**File**: [lib/middleware/rate-limit-store.ts](lib/middleware/rate-limit-store.ts) - `RedisRateLimitStore`

```typescript
class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClient;
  // Connects to Redis via REDIS_URL
}
```

**Features**:
- ✅ Distributed storage across instances
- ✅ Persistent rate limits
- ✅ Automatic TTL expiration
- ✅ Atomic increment operations
- ✅ Horizontal scaling support

**Requirements**:
- Redis server (localhost, managed service, or cluster)
- `redis` npm package installed
- `REDIS_URL` environment variable

## Setup

### 1. Install Redis Client (Production Only)

```bash
npm install redis
# or
yarn add redis
```

**Note**: Redis is an **optional dependency**. The app works without it using in-memory storage.

### 2. Configure Environment Variables

#### Development (In-Memory)
```bash
# .env.local
NODE_ENV=development
# No REDIS_URL needed - uses in-memory store
```

#### Production (Redis)
```bash
# .env.production
NODE_ENV=production
REDIS_URL=redis://localhost:6379
# or managed Redis:
# REDIS_URL=redis://user:password@redis.example.com:6379
# REDIS_URL=rediss://red-abc123.redis.cloud:6379  # TLS/SSL
```

### 3. Redis Server Options

#### Option A: Local Redis (Development/Testing)
```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Homebrew (macOS)
brew install redis
brew services start redis

# APT (Ubuntu/Debian)
sudo apt install redis-server
sudo systemctl start redis
```

#### Option B: Managed Redis (Production)

**Popular Services**:
- **Redis Cloud** (redis.com) - Free tier available
- **AWS ElastiCache** - Managed Redis on AWS
- **Azure Cache for Redis** - Managed Redis on Azure
- **Google Cloud Memorystore** - Managed Redis on GCP
- **Upstash Redis** - Serverless Redis with free tier

**Example**: Upstash Redis
1. Create account at upstash.com
2. Create Redis database
3. Copy connection URL
4. Set `REDIS_URL` environment variable

## Usage

### Rate Limiting (No Code Changes Needed)

The rate limiting middleware **automatically uses the appropriate store**:

```typescript
// app/api/properties/route.ts
import { rateLimit, RateLimits } from '@/lib/middleware/rate-limit';

export async function POST(request: Request) {
  // Automatically uses Redis in production, memory in dev
  const rateLimitResponse = await rateLimit(request, RateLimits.API);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Handle request...
}
```

### Manual Store Access (Advanced)

```typescript
import { getRateLimitStore } from '@/lib/middleware/rate-limit-store';

// Get singleton store instance
const store = getRateLimitStore();

// Get rate limit entry
const entry = await store.get('user:127.0.0.1:/api/properties');

// Set rate limit entry
await store.set('user:127.0.0.1:/api/properties', {
  count: 5,
  resetTime: Date.now() + 60000
});

// Increment counter (atomic in Redis)
const newCount = await store.increment('user:127.0.0.1:/api/properties');

// Delete entry
await store.delete('user:127.0.0.1:/api/properties');
```

## Redis Key Schema

### Rate Limit Keys
```
ratelimit:{identifier}:{pathname}
```

**Example**:
```
ratelimit:192.168.1.100:/api/properties
ratelimit:user@example.com:/api/payments
```

**TTL**: Automatically expires at `resetTime`

### Count Keys (Atomic Increment)
```
ratelimit:count:{identifier}:{pathname}
```

**Example**:
```
ratelimit:count:192.168.1.100:/api/properties
```

## Benefits

### Development
- ✅ Zero configuration
- ✅ No external dependencies
- ✅ Fast iteration
- ✅ Works offline

### Production
- ✅ **Horizontal Scaling**: Deploy multiple instances with shared rate limits
- ✅ **Persistence**: Rate limits survive server restarts
- ✅ **Consistency**: All instances see same counters
- ✅ **Performance**: Redis is extremely fast (<1ms operations)
- ✅ **Reliability**: Managed Redis services have high availability

## Performance

### In-Memory Store
- **GET**: <0.1ms (Map lookup)
- **SET**: <0.1ms (Map insert)
- **Memory**: ~100 bytes per entry
- **Cleanup**: Runs every 5 minutes

### Redis Store
- **GET**: <1ms (network + Redis)
- **SET**: <1ms (network + Redis)
- **INCREMENT**: <1ms (atomic operation)
- **TTL**: Automatic (Redis handles expiration)
- **Network**: Minimal overhead (binary protocol)

### Comparison

| Operation | Memory Store | Redis Store (Local) | Redis Store (Cloud) |
|-----------|--------------|---------------------|---------------------|
| GET       | <0.1ms       | <1ms                | 5-15ms              |
| SET       | <0.1ms       | <1ms                | 5-15ms              |
| Horizontal Scaling | ❌ No | ✅ Yes | ✅ Yes |
| Persistence | ❌ No | ✅ Yes | ✅ Yes |

## Monitoring

### Redis Connection Logs

```typescript
// Logs automatically written by RedisRateLimitStore

// On connect:
[INFO] Redis rate limit store connected

// On error:
[ERROR] Redis connection error: Connection refused

// On operations:
[ERROR] Redis GET error: timeout
```

### Check Redis Status

```bash
# Connect to Redis CLI
redis-cli

# Check connection
PING  # Should return PONG

# List all rate limit keys
KEYS ratelimit:*

# Get specific entry
GET ratelimit:192.168.1.100:/api/properties

# Check TTL
TTL ratelimit:192.168.1.100:/api/properties

# Get all counts
KEYS ratelimit:count:*

# Monitor real-time commands
MONITOR
```

## Fallback Behavior

### Redis Connection Failure

If Redis connection fails in production:

```typescript
// Store operations return null/defaults
const entry = await store.get(key);  // Returns null
await store.set(key, entry);         // Silently fails (logged)

// Rate limiting continues with degraded mode
// Requests are NOT rate limited (fail open for availability)
```

**Rationale**: Prefer availability over strict rate limiting. Redis failures won't bring down the app.

### Logging

All Redis errors are logged:
```
[ERROR] Redis connection error: ECONNREFUSED
[ERROR] Redis SET error: timeout after 5000ms
```

## Migration Guide

### From In-Memory to Redis

**No code changes required!**

1. **Install Redis client**:
   ```bash
   npm install redis
   ```

2. **Set environment variable**:
   ```bash
   # .env.production
   REDIS_URL=redis://your-redis-server:6379
   ```

3. **Deploy application**:
   ```bash
   npm run build
   npm start
   ```

4. **Verify Redis usage**:
   - Check logs for "Using Redis rate limit store for production"
   - Connect to Redis and verify keys: `redis-cli KEYS ratelimit:*`

### Testing Redis Locally

```bash
# Start local Redis
docker run -d -p 6379:6379 redis:alpine

# Set environment
export NODE_ENV=production
export REDIS_URL=redis://localhost:6379

# Run app
npm run dev

# Test rate limiting
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Check Redis
redis-cli
> KEYS ratelimit:*
> GET ratelimit:unknown:/api/properties
```

## Troubleshooting

### Issue: "Redis URL not configured"

**Symptoms**: Error on startup in production

**Cause**: `REDIS_URL` environment variable not set

**Solution**:
```bash
# Set REDIS_URL in your deployment environment
export REDIS_URL=redis://your-redis-server:6379
```

### Issue: "ECONNREFUSED" Error

**Symptoms**: Redis connection errors in logs

**Cause**: Redis server not running or not accessible

**Solutions**:
1. Verify Redis is running: `redis-cli PING`
2. Check firewall allows port 6379
3. Verify REDIS_URL hostname/IP is correct
4. For managed Redis, check credentials and TLS requirements

### Issue: Rate Limits Not Shared Across Instances

**Symptoms**: Each server instance has independent rate limits

**Cause**: Using in-memory store instead of Redis

**Solution**:
1. Verify `REDIS_URL` is set
2. Check logs for "Using Redis rate limit store"
3. Restart application after setting `REDIS_URL`

### Issue: High Redis Latency

**Symptoms**: Slow API responses

**Cause**: Redis server is far away or overloaded

**Solutions**:
1. Use Redis in same region as app servers
2. Use managed Redis with optimized networking
3. Enable Redis connection pooling
4. Monitor Redis performance: `redis-cli INFO stats`

## Security Considerations

### Redis Connection

**Recommendations**:
- ✅ Use TLS/SSL for production: `rediss://` (note the double 's')
- ✅ Set strong Redis password: `redis://user:password@host:6379`
- ✅ Use private network (VPC) for Redis
- ✅ Enable Redis AUTH and ACLs
- ✅ Restrict Redis port (6379) to app servers only

**Example Secure URL**:
```bash
REDIS_URL=rediss://default:strong-password@redis.example.com:6380
```

### Rate Limit Bypass

**Attack**: Attacker changes IP to bypass rate limits

**Mitigation**:
- Use `x-forwarded-for` header (set by trusted proxy)
- Consider user ID + IP for authenticated endpoints
- Monitor for suspicious patterns

## Production Checklist

Deploying with Redis rate limiting:

- [ ] Redis server deployed and accessible
- [ ] `REDIS_URL` environment variable set
- [ ] `redis` npm package installed
- [ ] TLS/SSL enabled for Redis connection
- [ ] Redis password configured
- [ ] Redis port restricted to app servers
- [ ] Redis monitoring/alerts configured
- [ ] Tested rate limiting with multiple instances
- [ ] Verified shared counters across instances
- [ ] Logs confirm "Using Redis rate limit store"

## Related Files

### Created/Modified:
- [lib/middleware/rate-limit-store.ts](lib/middleware/rate-limit-store.ts) - Store implementations
- [lib/middleware/rate-limit.ts](lib/middleware/rate-limit.ts) - Updated to use abstract store

### Related Documentation:
- [docs/WEEK_1_COMPLETE.md](WEEK_1_COMPLETE.md) - Initial rate limiting implementation
- [docs/WEEK_2_SECURITY_COMPLETE.md](WEEK_2_SECURITY_COMPLETE.md) - Security overview

## References

- [Redis Documentation](https://redis.io/docs/)
- [node-redis Client](https://github.com/redis/node-redis)
- [Rate Limiting Patterns with Redis](https://redis.io/docs/manual/patterns/rate-limiter/)
- [OWASP: Denial of Service Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

---

**Status**: Complete  
**Production Ready**: ✅ (with optional Redis)  
**Backward Compatible**: ✅ (works without Redis)  
**Zero Downtime Migration**: ✅
