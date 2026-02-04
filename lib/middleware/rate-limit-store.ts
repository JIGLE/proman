/**
 * Redis Rate Limiting Store
 * 
 * Production-grade distributed rate limiting using Redis.
 * Supports horizontal scaling with consistent rate limits across instances.
 */

import { logger } from '@/lib/utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Abstract rate limit store interface
 */
export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  increment(key: string): Promise<number>;
  delete(key: string): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * In-memory rate limit store (development)
 * Simple Map-based storage for single-instance deployments
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Auto-cleanup expired entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (entry.resetTime < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string): Promise<number> {
    const entry = await this.get(key);
    if (entry) {
      entry.count++;
      await this.set(key, entry);
      return entry.count;
    }
    return 1;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} expired rate limit entries`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Redis rate limit store (production)
 * Distributed rate limiting with automatic expiration
 */
export class RedisRateLimitStore implements RateLimitStore {
  private client: any = null; // Redis client (dynamically imported)
  private connected = false;
  private initializing = false;
  private initPromise: Promise<void> | null = null;

  constructor(redisUrl?: string) {
    // Start initialization but don't block constructor
    this.initPromise = this.initializeRedis(redisUrl);
  }

  private async initializeRedis(redisUrl?: string): Promise<void> {
    if (this.initializing || this.connected) return;
    this.initializing = true;

    try {
      // Dynamically import Redis client (avoid bundling if not used)
      // Use type assertion to avoid compile-time Redis dependency
      const redis = await import('redis' as string).catch(() => {
        throw new Error('Redis package not installed. Run: npm install redis');
      }) as any;
      
      const url = redisUrl || process.env.REDIS_URL;
      if (!url) {
        throw new Error('Redis URL not configured. Set REDIS_URL environment variable.');
      }

      this.client = redis.createClient({ url });

      this.client.on('error', (err: Error) => {
        logger.error('Redis connection error', err, { component: 'RedisRateLimitStore' });
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis rate limit store connected', { component: 'RedisRateLimitStore' });
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis rate limit store', error instanceof Error ? error : new Error(String(error)), {
        component: 'RedisRateLimitStore',
      });
      this.initializing = false;
      throw error;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    await this.ensureConnected();
    if (!this.connected) return null;

    try {
      const data = await this.client.get(`ratelimit:${key}`);
      if (!data) return null;

      const entry = JSON.parse(data) as RateLimitEntry;
      
      // Check if expired (Redis TTL handles this, but double-check)
      if (entry.resetTime < Date.now()) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      logger.error('Redis GET error', error instanceof Error ? error : new Error(String(error)), {
        component: 'RedisRateLimitStore',
        key,
      });
      return null;
    }
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    await this.ensureConnected();
    if (!this.connected) return;

    try {
      const ttl = Math.ceil((entry.resetTime - Date.now()) / 1000);
      if (ttl <= 0) return; // Already expired

      await this.client.setEx(
        `ratelimit:${key}`,
        ttl,
        JSON.stringify(entry)
      );
    } catch (error) {
      logger.error('Redis SET error', error instanceof Error ? error : new Error(String(error)), {
        component: 'RedisRateLimitStore',
        key,
      });
    }
  }

  async increment(key: string): Promise<number> {
    await this.ensureConnected();
    if (!this.connected) return 1;

    try {
      // Use Redis INCR for atomic increment
      const count = await this.client.incr(`ratelimit:count:${key}`);
      return count;
    } catch (error) {
      logger.error('Redis INCREMENT error', error instanceof Error ? error : new Error(String(error)), {
        component: 'RedisRateLimitStore',
        key,
      });
      return 1;
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnected();
    if (!this.connected) return;

    try {
      await this.client.del(`ratelimit:${key}`);
      await this.client.del(`ratelimit:count:${key}`);
    } catch (error) {
      logger.error('Redis DELETE error', error instanceof Error ? error : new Error(String(error)), {
        component: 'RedisRateLimitStore',
        key,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

/**
 * Rate limit store factory
 * Automatically selects appropriate store based on environment
 */
export function createRateLimitStore(): RateLimitStore {
  const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';

  if (useRedis) {
    logger.info('Using Redis rate limit store for production', {
      component: 'RateLimitStore',
    });
    return new RedisRateLimitStore();
  } else {
    logger.info('Using in-memory rate limit store for development', {
      component: 'RateLimitStore',
    });
    return new MemoryRateLimitStore();
  }
}

// Singleton instance
let storeInstance: RateLimitStore | null = null;

/**
 * Get global rate limit store instance
 */
export function getRateLimitStore(): RateLimitStore {
  if (!storeInstance) {
    storeInstance = createRateLimitStore();
  }
  return storeInstance;
}
