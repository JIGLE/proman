/**
 * Security Headers Middleware
 * Implements security best practices via HTTP headers
 * 
 * Headers implemented:
 * - HSTS (HTTP Strict Transport Security)
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - X-XSS-Protection (Legacy XSS protection)
 * - Referrer-Policy (Referrer information control)
 * - Permissions-Policy (Feature policy)
 * - Content-Security-Policy (XSS and injection protection)
 */

import { NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  enableHSTS?: boolean;
  enableFrameProtection?: boolean;
  enableContentTypeProtection?: boolean;
  enableXSSProtection?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  enableCSP?: boolean;
  cspDirectives?: ContentSecurityPolicyDirectives;
}

export interface ContentSecurityPolicyDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  frameSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  workerSrc?: string[];
  formAction?: string[];
  frameAncestors?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
}

/**
 * Default CSP directives - restrictive but functional
 */
const DEFAULT_CSP_DIRECTIVES: ContentSecurityPolicyDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for Next.js inline scripts - TODO: use nonces
    "'unsafe-eval'",   // Required for Next.js dev mode - remove in production
    'https://accounts.google.com',
    'https://apis.google.com',
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Required for styled-components/CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  imgSrc: [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ],
  fontSrc: [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ],
  connectSrc: [
    "'self'",
    'https://accounts.google.com',
    'https://api.stripe.com',
  ],
  frameSrc: [
    "'self'",
    'https://accounts.google.com',
    'https://js.stripe.com',
  ],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'", 'blob:'],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: true,
};

/**
 * Build CSP header value from directives
 */
function buildCSPHeader(directives: ContentSecurityPolicyDirectives): string {
  const parts: string[] = [];

  if (directives.defaultSrc) {
    parts.push(`default-src ${directives.defaultSrc.join(' ')}`);
  }
  if (directives.scriptSrc) {
    parts.push(`script-src ${directives.scriptSrc.join(' ')}`);
  }
  if (directives.styleSrc) {
    parts.push(`style-src ${directives.styleSrc.join(' ')}`);
  }
  if (directives.imgSrc) {
    parts.push(`img-src ${directives.imgSrc.join(' ')}`);
  }
  if (directives.fontSrc) {
    parts.push(`font-src ${directives.fontSrc.join(' ')}`);
  }
  if (directives.connectSrc) {
    parts.push(`connect-src ${directives.connectSrc.join(' ')}`);
  }
  if (directives.frameSrc) {
    parts.push(`frame-src ${directives.frameSrc.join(' ')}`);
  }
  if (directives.objectSrc) {
    parts.push(`object-src ${directives.objectSrc.join(' ')}`);
  }
  if (directives.mediaSrc) {
    parts.push(`media-src ${directives.mediaSrc.join(' ')}`);
  }
  if (directives.workerSrc) {
    parts.push(`worker-src ${directives.workerSrc.join(' ')}`);
  }
  if (directives.formAction) {
    parts.push(`form-action ${directives.formAction.join(' ')}`);
  }
  if (directives.frameAncestors) {
    parts.push(`frame-ancestors ${directives.frameAncestors.join(' ')}`);
  }
  if (directives.baseUri) {
    parts.push(`base-uri ${directives.baseUri.join(' ')}`);
  }
  if (directives.upgradeInsecureRequests) {
    parts.push('upgrade-insecure-requests');
  }

  return parts.join('; ');
}

/**
 * Apply security headers to a response
 * 
 * @param response - The response to modify
 * @param config - Optional configuration to enable/disable specific headers
 * @returns Modified response with security headers
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const {
    enableHSTS = true,
    enableFrameProtection = true,
    enableContentTypeProtection = true,
    enableXSSProtection = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true,
    enableCSP = true,
    cspDirectives = DEFAULT_CSP_DIRECTIVES,
  } = config;

  // HSTS: Force HTTPS for 1 year, include subdomains
  if (enableHSTS && process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // X-Frame-Options: Prevent clickjacking
  if (enableFrameProtection) {
    response.headers.set('X-Frame-Options', 'DENY');
  }

  // X-Content-Type-Options: Prevent MIME sniffing
  if (enableContentTypeProtection) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }

  // X-XSS-Protection: Legacy XSS protection for older browsers
  if (enableXSSProtection) {
    response.headers.set('X-XSS-Protection', '1; mode=block');
  }

  // Referrer-Policy: Control referrer information
  if (enableReferrerPolicy) {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Permissions-Policy: Disable unnecessary browser features
  if (enablePermissionsPolicy) {
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
  }

  // Content-Security-Policy: XSS and injection protection
  if (enableCSP) {
    const cspHeader = buildCSPHeader(cspDirectives);
    response.headers.set('Content-Security-Policy', cspHeader);
  }

  return response;
}

/**
 * Higher-order function to wrap API handlers with security headers
 * 
 * @example
 * ```typescript
 * export const GET = withSecurityHeaders(async (request) => {
 *   return NextResponse.json({ data: 'secure' });
 * });
 * ```
 */
export function withSecurityHeaders(
  handler: (request: Request) => Promise<Response>,
  config?: SecurityHeadersConfig
) {
  return async (request: Request): Promise<Response> => {
    const response = await handler(request);
    const nextResponse = NextResponse.next({ ...response });
    return applySecurityHeaders(nextResponse, config);
  };
}
