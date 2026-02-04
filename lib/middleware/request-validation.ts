/**
 * Request Validation Middleware
 * Validates request size, content type, and structure
 */

import { NextRequest } from 'next/server';

export interface RequestValidationConfig {
  maxBodySize?: number; // bytes
  allowedContentTypes?: string[];
  requireContentType?: boolean;
}

const DEFAULT_MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_CONTENT_TYPES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
];

/**
 * Validate request body size
 */
export async function validateRequestSize(
  request: NextRequest,
  maxSize: number = DEFAULT_MAX_BODY_SIZE
): Promise<Response | null> {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    return new Response(
      JSON.stringify({
        error: 'Request too large',
        message: `Request body exceeds maximum size of ${maxSize} bytes`,
        maxSize,
      }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}

/**
 * Validate request content type
 */
export function validateContentType(
  request: NextRequest,
  allowedTypes: string[] = DEFAULT_ALLOWED_CONTENT_TYPES,
  required: boolean = false
): Response | null {
  const contentType = request.headers.get('content-type');

  if (!contentType) {
    if (required) {
      return new Response(
        JSON.stringify({
          error: 'Missing Content-Type',
          message: 'Content-Type header is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return null;
  }

  // Check if content type matches any allowed type (considering charset etc)
  const matches = allowedTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );

  if (!matches) {
    return new Response(
      JSON.stringify({
        error: 'Invalid Content-Type',
        message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
        received: contentType,
      }),
      {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}

/**
 * Complete request validation
 */
export async function validateRequest(
  request: NextRequest,
  config: RequestValidationConfig = {}
): Promise<Response | null> {
  const {
    maxBodySize = DEFAULT_MAX_BODY_SIZE,
    allowedContentTypes = DEFAULT_ALLOWED_CONTENT_TYPES,
    requireContentType = false,
  } = config;

  // Skip validation for methods without body
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  // Validate content type
  const contentTypeError = validateContentType(request, allowedContentTypes, requireContentType);
  if (contentTypeError) return contentTypeError;

  // Validate body size
  const sizeError = await validateRequestSize(request, maxBodySize);
  if (sizeError) return sizeError;

  return null;
}

/**
 * Higher-order function to wrap handlers with request validation
 */
export function withRequestValidation(
  handler: (request: NextRequest) => Promise<Response>,
  config?: RequestValidationConfig
) {
  return async (request: NextRequest): Promise<Response> => {
    const validationError = await validateRequest(request, config);
    if (validationError) return validationError;
    
    return handler(request);
  };
}

/**
 * Stricter validation for API endpoints accepting JSON only
 */
export const JSON_ONLY_VALIDATION: RequestValidationConfig = {
  maxBodySize: 1 * 1024 * 1024, // 1MB for JSON
  allowedContentTypes: ['application/json'],
  requireContentType: true,
};

/**
 * Validation for file upload endpoints
 */
export const FILE_UPLOAD_VALIDATION: RequestValidationConfig = {
  maxBodySize: 50 * 1024 * 1024, // 50MB for files
  allowedContentTypes: ['multipart/form-data'],
  requireContentType: true,
};
