/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse, brute force attacks, and DDoS.
 * Uses Redis for production (distributed), in-memory for development.
 */

import { getRateLimitStore, type RateLimitStore } from './rate-limit-store';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  
  /**
   * Time window in seconds
   */
  windowSeconds: number;
  
  /**
   * Custom identifier function (default uses IP address)
   */
  identifier?: (request: Request) => string;
  
  /**
   * Skip rate limiting based on condition
   */
  skip?: (request: Request) => boolean;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RateLimits = {
  /** General API endpoints - 100 requests per minute */
  API: { maxRequests: 100, windowSeconds: 60 },
  
  /** Authentication endpoints - 5 requests per 15 minutes */
  AUTH: { maxRequests: 5, windowSeconds: 15 * 60 },
  
  /** Payment endpoints - 10 requests per minute */
  PAYMENT: { maxRequests: 10, windowSeconds: 60 },
  
  /** Webhook endpoints - 30 requests per minute */
  WEBHOOK: { maxRequests: 30, windowSeconds: 60 },
  
  /** Public endpoints - 200 requests per minute */
  PUBLIC: { maxRequests: 200, windowSeconds: 60 },
  
  /** Strict rate limit for sensitive operations - 3 requests per hour */
  STRICT: { maxRequests: 3, windowSeconds: 60 * 60 },
} as const;

/**
 * Get client identifier from request (IP address by default)
 */
function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) return cfConnectingIp;
  
  // Fallback to a generic identifier if no IP found
  return 'unknown';
}

/**
 * Apply rate limiting to a request
 * 
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns Response with 429 status if rate limit exceeded, null otherwise
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  // Check if we should skip rate limiting
  if (config.skip && config.skip(request)) {
    return null;
  }
  
  // Get rate limit store (Redis in production, memory in dev)
  const store = getRateLimitStore();
  
  // Get client identifier
  const identifier = config.identifier 
    ? config.identifier(request) 
    : getClientIdentifier(request);
  
  // Create a unique key for this client + endpoint combination
  const url = new URL(request.url);
  const key = `${identifier}:${url.pathname}`;
  
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  
  // Get or create rate limit entry
  let entry = await store.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    await store.set(key, entry);
    
    // Add rate limit headers
    return addRateLimitHeaders(null, config, entry);
  }
  
  // Increment request count
  entry.count++;
  await store.set(key, entry);
  
  // Check if rate limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
        },
      }
    );
  }
  
  return addRateLimitHeaders(null, config, entry);
}

/**
 * Add rate limit headers to a response
 */
function addRateLimitHeaders(
  response: Response | null,
  config: RateLimitConfig,
  entry: RateLimitEntry
): Response | null {
  // If there's no response, we're just passing through (not rate limited)
  // Return null to indicate success
  return null;
}

/**
 * Create a rate limit wrapper for API routes
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimitResponse = await rateLimit(request, RateLimits.PAYMENT);
 *   if (rateLimitResponse) return rateLimitResponse;
 *   
 *   // Handle request normally
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (request: Request) => rateLimit(request, config);
}

/**
 * Get current rate limit status for a client
 */
export async function getRateLimitStatus(
  request: Request,
  config: RateLimitConfig
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
}> {
  const store = getRateLimitStore();
  const identifier = config.identifier 
    ? config.identifier(request) 
    : getClientIdentifier(request);
  
  const url = new URL(request.url);
  const key = `${identifier}:${url.pathname}`;
  
  const entry = await store.get(key);
  
  if (!entry) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowSeconds * 1000,
    };
  }
  
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: entry.resetTime,
  };
}
