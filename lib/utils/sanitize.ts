import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML input to prevent XSS attacks
 * @param input - The input to sanitize
 * @returns Sanitized string safe for HTML rendering
 */
export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string' || input.length === 0) {
    return '';
  }

  // Ensure we pass a string and explicitly disallow tags and attributes
  return DOMPurify.sanitize(String(input), {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  });
}

/**
 * Sanitizes input for database storage (removes potentially dangerous characters)
 * @param input - The input to sanitize
 * @returns Sanitized string safe for database storage
 */
export function sanitizeForDatabase(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  // First strip any HTML tags using DOMPurify (no tags allowed), then collapse whitespace
  const stripped = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return String(stripped)
    // Remove any HTML entities (e.g., &amp;) that may remain after sanitization
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[<>'"&]/g, '') // Remove remaining dangerous characters
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .slice(0, 10000); // Limit length to prevent DoS
}

/**
 * Sanitizes filename for safe file operations
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: unknown): string {
  if (typeof filename !== 'string' || filename.length === 0) {
    return 'file';
  }

  let s = String(filename)
    // Normalize path separators to underscore
    .replace(/[\\/]+/g, '_')

  // Collapse directory traversal dots into a safe delimiter
  s = s.replace(/\.\.+/g, '_')

  s = s
    .replace(/[^a-zA-Z0-9._-]+/g, '_') // Replace other unsafe characters with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/\.{2,}/g, '.') // Collapse multiple dots
    .replace(/^[_\.]+|[_\.]+$/g, '') // Remove leading/trailing underscores/dots
    .slice(0, 255); // Limit length

  return s
}

/**
 * Validates and sanitizes email addresses
 * @param email - The email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitizes numeric input
 * @param input - The input to convert to number
 * @param defaultValue - Default value if conversion fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized number
 */
export function sanitizeNumber(
  input: unknown,
  defaultValue: number = 0,
  min?: number,
  max?: number
): number {
  const num = Number(String(input));

  if (isNaN(num)) {
    return defaultValue;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}
