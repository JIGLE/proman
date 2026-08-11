import { resolveClientIp } from "@/lib/utils/security";

// Rate limiting utility for API routes
// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = process.env.NODE_ENV === "development" ? 10000 : 100; // Higher limit for local stress testing

/**
 * Delegates to the shared resolver, which counts X-Forwarded-For from the right. Reading the
 * leftmost entry — as this did — let a caller pick their own rate-limit bucket per request.
 */
export function getClientIP(request: Request): string {
  return resolveClientIp(request);
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  clientData.count++;
  return false;
}

// Test helpers (for unit tests) — intentionally minimal
export function _resetRateLimitMap(): void {
  rateLimitMap.clear();
}

export function _setRateLimitForIP(ip: string, count: number, ttlMs?: number): void {
  rateLimitMap.set(ip, {
    count,
    resetTime: Date.now() + (typeof ttlMs === "number" ? ttlMs : RATE_LIMIT_WINDOW),
  });
}

export function checkRateLimit(request: Request): Response | null {
  // Same E2E opt-out as lib/middleware/rate-limit.ts. There are two independent rate limiters in
  // this codebase and they guard different routes, so gating only one leaves the suite still
  // hitting 429s — which is exactly what happened on the first attempt.
  if (process.env.E2E_DISABLE_RATE_LIMIT === "true") {
    return null;
  }

  const clientIP = getClientIP(request);

  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  return null; // No rate limit violation
}

// Higher-order function to wrap API handlers with rate limiting
export function withRateLimit<T extends Request, A extends readonly unknown[] = readonly unknown[]>(
  handler: (request: T, ...args: A) => Promise<Response>,
) {
  return async (request: T, ...args: A): Promise<Response> => {
    const rateLimitResponse = checkRateLimit(request as Request);
    if (rateLimitResponse) return rateLimitResponse;

    return handler(request, ...args);
  };
}
