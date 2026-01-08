import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for HTML rendering
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  });
}

/**
 * Sanitizes input for database storage (removes potentially dangerous characters)
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for database storage
 */
export function sanitizeForDatabase(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>'"&]/g, '') // Remove HTML characters
    .trim()
    .slice(0, 10000); // Limit length to prevent DoS
}

/**
 * Sanitizes filename for safe file operations
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'file';
  }

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .slice(0, 255); // Limit length
}

/**
 * Validates and sanitizes email addresses
 * @param email - The email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
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