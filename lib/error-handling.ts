import { NextRequest, NextResponse } from 'next/server';

// Custom error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Logger utility
export class Logger {
  static log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };

    // In production, you might want to use a proper logging service
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  static info(message: string, data?: any) {
    this.log('info', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  static error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

// Error response utility
export function createErrorResponse(
  error: Error,
  statusCode: number = 500,
  request?: NextRequest
): NextResponse {
  // Log the error
  Logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers.get('user-agent'),
  });

  // Determine error response based on error type
  let message = 'Internal server error';
  let status = statusCode;

  if (error instanceof ValidationError) {
    message = error.message;
    status = 400;
  } else if (error instanceof AuthenticationError) {
    message = error.message;
    status = 401;
  } else if (error instanceof AuthorizationError) {
    message = error.message;
    status = 403;
  } else if (error instanceof DatabaseError) {
    message = 'Database operation failed';
    status = 500;
  }

  return new NextResponse(
    JSON.stringify({
      error: message,
      ...(error instanceof ValidationError && error.field && { field: error.field }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// Success response utility
export function createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
  return new NextResponse(
    JSON.stringify(data),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// Async error wrapper for API routes
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return createErrorResponse(error as Error, 500, request);
    }
  };
}