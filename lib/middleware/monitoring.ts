/**
 * API Monitoring Middleware
 * 
 * Tracks API requests, responses, and errors
 * Records metrics and performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { PerformanceTimer } from '@/lib/monitoring/performance';
import { apiMetrics } from '@/lib/monitoring/metrics';
import { trackError } from '@/lib/monitoring/error-tracker';

/**
 * Extract route pattern from URL
 */
function getRoutePattern(pathname: string): string {
  // Remove /api prefix
  let route = pathname.replace(/^\/api/, '');
  
  // Replace UUIDs and IDs with placeholder
  route = route.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
  route = route.replace(/\/\d+/g, '/:id');
  
  return route || '/';
}

/**
 * Wrap API handler with monitoring
 */
export function withMonitoring<T = unknown>(
  handler: (request: NextRequest, context?: T) => Promise<Response | NextResponse>
): (request: NextRequest, context?: T) => Promise<Response | NextResponse> {
  return async (request: NextRequest, context?: T): Promise<Response | NextResponse> => {
    const timer = new PerformanceTimer('api.request');
    const method = request.method;
    const pathname = new URL(request.url).pathname;
    const route = getRoutePattern(pathname);

    // Record request
    apiMetrics.request(route, method);

    // Create child logger with request context
    const requestLogger = logger.child({
      route,
      method,
      url: pathname,
      userAgent: request.headers.get('user-agent'),
    });

    requestLogger.info('API request started');

    try {
      // Execute handler
      const response = await handler(request, context);
      
      // Get duration
      const duration = timer.end(true);
      
      // Record success metrics
      const statusCode = response.status;
      if (statusCode >= 200 && statusCode < 300) {
        apiMetrics.success(route, method);
      } else if (statusCode >= 400) {
        apiMetrics.error(route, method, String(statusCode));
      }
      
      apiMetrics.responseTime(route, duration);

      // Log response
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
      requestLogger[logLevel]('API request completed', {
        statusCode,
        duration: `${duration.toFixed(2)}ms`,
      });

      return response;
    } catch (error) {
      // Get duration
      const duration = timer.end(false);

      // Record error metrics
      apiMetrics.error(route, method, '500');
      apiMetrics.responseTime(route, duration);

      // Track error
      if (error instanceof Error) {
        trackError(error, {
          request: {
            url: pathname,
            method,
            headers: Object.fromEntries(request.headers.entries()),
          },
          component: 'API',
          action: route,
        }, false);
      }

      // Log error
      requestLogger.error('API request failed', error instanceof Error ? error : undefined, {
        duration: `${duration.toFixed(2)}ms`,
      });

      // Re-throw to let error handler deal with it
      throw error;
    }
  };
}

/**
 * Create monitoring middleware for specific routes
 */
export function createMonitoringMiddleware(
  routeName: string,
  options: {
    logBody?: boolean;
    logHeaders?: boolean;
  } = {}
) {
  return async <T>(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<Response | NextResponse>,
    context?: T
  ): Promise<Response | NextResponse> => {
    const timer = new PerformanceTimer(`api.${routeName}`);
    const method = request.method;

    // Create logger
    const requestLogger = logger.child({
      route: routeName,
      method,
    });

    // Log request details if enabled
    if (options.logBody || options.logHeaders) {
      const logData: Record<string, unknown> = {};
      
      if (options.logHeaders) {
        logData.headers = Object.fromEntries(request.headers.entries());
      }
      
      if (options.logBody && request.body) {
        try {
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();
          logData.body = body;
        } catch (e) {
          // Body is not JSON or already consumed
        }
      }

      requestLogger.debug('Request details', logData);
    }

    try {
      const response = await handler(request);
      const duration = timer.end(true);

      requestLogger.info('Request completed', {
        statusCode: response.status,
        duration: `${duration.toFixed(2)}ms`,
      });

      return response;
    } catch (error) {
      const duration = timer.end(false);

      if (error instanceof Error) {
        trackError(error, {
          component: routeName,
          request: {
            url: request.url,
            method,
          },
        }, false);
      }

      requestLogger.error('Request failed', error instanceof Error ? error : undefined, {
        duration: `${duration.toFixed(2)}ms`,
      });

      throw error;
    }
  };
}
