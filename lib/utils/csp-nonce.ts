/**
 * CSP Nonce Generation and Management
 * 
 * Generates cryptographically secure nonces for Content Security Policy
 * to enable strict CSP without unsafe-inline/unsafe-eval
 */

import { randomBytes } from 'crypto';
import { headers } from 'next/headers';

/**
 * Generate a cryptographically secure nonce
 * 
 * @returns Base64-encoded random nonce
 */
export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * Get the CSP nonce from request headers (async in Next.js 15+)
 * This is set by the middleware and passed through Next.js headers
 * 
 * @returns Promise resolving to nonce string or undefined if not available
 */
export async function getNonce(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get('x-nonce') || undefined;
  } catch (error) {
    // headers() can only be called in Server Components
    // Return undefined for Client Components
    return undefined;
  }
}

/**
 * Get nonce for script tags in Server Components (async)
 * 
 * @returns Promise resolving to nonce attribute string or empty string
 */
export async function getScriptNonce(): Promise<string> {
  const nonce = await getNonce();
  return nonce ? `nonce="${nonce}"` : '';
}

/**
 * Get nonce for style tags in Server Components (async)
 * 
 * @returns Promise resolving to nonce attribute string or empty string
 */
export async function getStyleNonce(): Promise<string> {
  const nonce = await getNonce();
  return nonce ? `nonce="${nonce}"` : '';
}

/**
 * CSP nonce context for React
 * Use this in Client Components via useContext
 */
export interface NonceContext {
  nonce?: string;
  scriptNonce: string;
  styleNonce: string;
}

/**
 * Create nonce context object
 * 
 * @param nonce - Optional nonce value
 * @returns Nonce context object
 */
export function createNonceContext(nonce?: string): NonceContext {
  const scriptNonce = nonce ? `nonce="${nonce}"` : '';
  const styleNonce = nonce ? `nonce="${nonce}"` : '';
  
  return {
    nonce,
    scriptNonce,
    styleNonce,
  };
}
