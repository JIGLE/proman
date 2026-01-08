// Rate limiting utility for API routes
// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (clientIP) {
    return clientIP;
  }

  // For development, use a default IP
  return '127.0.0.1';
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
  rateLimitMap.set(ip, { count, resetTime: Date.now() + (typeof ttlMs === 'number' ? ttlMs : RATE_LIMIT_WINDOW) });
}

export function checkRateLimit(request: Request): Response | null {
  const clientIP = getClientIP(request);

  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  return null; // No rate limit violation
}

// Higher-order function to wrap API handlers with rate limiting
export function withRateLimit<
  T extends Request,
  A extends readonly unknown[] = readonly unknown[]
>(handler: (request: T, ...args: A) => Promise<Response>) {
  return async (request: T, ...args: A): Promise<Response> => {
    const rateLimitResponse = checkRateLimit(request as Request);
    if (rateLimitResponse) return rateLimitResponse;

    return handler(request, ...args);
  };
}