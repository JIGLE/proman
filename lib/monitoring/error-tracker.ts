/**
 * Error Tracking and Monitoring
 * 
 * Centralized error tracking with integration points for:
 * - Sentry
 * - LogRocket
 * - Custom error monitoring services
 * 
 * Provides error aggregation, context enrichment, and filtering.
 */

import { logger } from '@/lib/utils/logger';

export interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackedError {
  id: string;
  timestamp: number;
  error: Error;
  context?: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

// Error store for debugging
class ErrorStore {
  private errors: TrackedError[] = [];
  private readonly maxSize = 50;

  add(trackedError: TrackedError): void {
    this.errors.push(trackedError);
    if (this.errors.length > this.maxSize) {
      this.errors.shift();
    }
  }

  getRecent(count: number = 10): TrackedError[] {
    return this.errors.slice(-count);
  }

  getAll(): TrackedError[] {
    return [...this.errors];
  }

  clear(): void {
    this.errors = [];
  }

  getByComponent(component: string): TrackedError[] {
    return this.errors.filter(e => e.context?.component === component);
  }
}

const errorStore = new ErrorStore();

/**
 * Determine error severity based on error type and context
 */
function determineSeverity(error: Error, context?: ErrorContext): TrackedError['severity'] {
  // Critical: Authentication, authorization, database errors
  if (
    error.name === 'AuthenticationError' ||
    error.name === 'DatabaseError' ||
    error.message.toLowerCase().includes('database') ||
    error.message.toLowerCase().includes('prisma')
  ) {
    return 'critical';
  }

  // High: API errors, validation failures in critical flows
  if (
    error.name === 'AuthorizationError' ||
    (error.name === 'ValidationError' && context?.action?.includes('payment'))
  ) {
    return 'high';
  }

  // Medium: General validation errors, network issues
  if (
    error.name === 'ValidationError' ||
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch')
  ) {
    return 'medium';
  }

  // Low: Everything else
  return 'low';
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Track an error with context
 */
export function trackError(
  error: Error,
  context?: ErrorContext,
  handled: boolean = false
): TrackedError {
  const severity = determineSeverity(error, context);
  
  const trackedError: TrackedError = {
    id: generateErrorId(),
    timestamp: Date.now(),
    error,
    context,
    severity,
    handled,
  };

  // Store error
  errorStore.add(trackedError);

  // Log error
  logger.error(
    `[${severity.toUpperCase()}] ${error.message}`,
    error,
    {
      errorId: trackedError.id,
      severity,
      handled,
      component: context?.component,
      action: context?.action,
      userId: context?.user?.id,
      url: context?.request?.url,
      ...context?.metadata,
    }
  );

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    sendToMonitoringService(trackedError);
  }

  return trackedError;
}

/**
 * Send error to monitoring service (Sentry, LogRocket, etc.)
 */
function sendToMonitoringService(trackedError: TrackedError): void {
  // Integration point for external services
  
  // Example: Sentry
  if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (error: Error, context?: Record<string, unknown>) => void } }).Sentry) {
    try {
      (window as unknown as { Sentry: { captureException: (error: Error, context?: Record<string, unknown>) => void } }).Sentry.captureException(trackedError.error, {
        level: trackedError.severity,
        tags: {
          component: trackedError.context?.component,
          action: trackedError.context?.action,
          handled: trackedError.handled,
        },
        user: trackedError.context?.user,
        extra: {
          errorId: trackedError.id,
          ...trackedError.context?.metadata,
        },
      });
    } catch (e) {
      console.error('Failed to send error to Sentry:', e);
    }
  }

  // Example: LogRocket
  if (typeof window !== 'undefined' && (window as unknown as { LogRocket?: { captureException: (error: Error, context?: Record<string, unknown>) => void } }).LogRocket) {
    try {
      (window as unknown as { LogRocket: { captureException: (error: Error, context?: Record<string, unknown>) => void } }).LogRocket.captureException(trackedError.error, {
        tags: {
          severity: trackedError.severity,
          component: trackedError.context?.component,
        },
        extra: {
          errorId: trackedError.id,
          ...trackedError.context?.metadata,
        },
      });
    } catch (e) {
      console.error('Failed to send error to LogRocket:', e);
    }
  }

  // Custom monitoring endpoint
  if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: trackedError.id,
        timestamp: trackedError.timestamp,
        message: trackedError.error.message,
        stack: trackedError.error.stack,
        severity: trackedError.severity,
        context: trackedError.context,
        handled: trackedError.handled,
      }),
    }).catch((e) => {
      console.error('Failed to send error to monitoring endpoint:', e);
    });
  }
}

/**
 * Create an error handler with context
 */
export function createErrorHandler(baseContext: ErrorContext) {
  return (error: Error, additionalContext?: Partial<ErrorContext>) => {
    const context: ErrorContext = {
      ...baseContext,
      ...additionalContext,
      metadata: {
        ...baseContext.metadata,
        ...additionalContext?.metadata,
      },
    };
    
    trackError(error, context, true);
  };
}

/**
 * Async error wrapper with tracking
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      trackError(error, context, false);
    }
    throw error;
  }
}

/**
 * Get recent errors (for debugging)
 */
export function getRecentErrors(count: number = 10): TrackedError[] {
  return errorStore.getRecent(count);
}

/**
 * Get all tracked errors
 */
export function getAllErrors(): TrackedError[] {
  return errorStore.getAll();
}

/**
 * Get errors by component
 */
export function getErrorsByComponent(component: string): TrackedError[] {
  return errorStore.getByComponent(component);
}

/**
 * Clear error store (useful for testing)
 */
export function clearErrors(): void {
  errorStore.clear();
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  bySeverity: Record<string, number>;
  byComponent: Record<string, number>;
  handled: number;
  unhandled: number;
} {
  const errors = errorStore.getAll();
  
  const stats = {
    total: errors.length,
    bySeverity: {} as Record<string, number>,
    byComponent: {} as Record<string, number>,
    handled: 0,
    unhandled: 0,
  };

  errors.forEach((err) => {
    // By severity
    stats.bySeverity[err.severity] = (stats.bySeverity[err.severity] || 0) + 1;
    
    // By component
    const component = err.context?.component || 'unknown';
    stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
    
    // Handled vs unhandled
    if (err.handled) {
      stats.handled++;
    } else {
      stats.unhandled++;
    }
  });

  return stats;
}
