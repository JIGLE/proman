/**
 * Structured Logger for ProMan
 * 
 * Environment-aware logging that:
 * - Only logs in development or when DEBUG=true
 * - Formats logs as structured JSON in production
 * - Provides typed log levels and contexts
 * - Prepares hooks for future monitoring integration (Sentry, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Check if we should log based on environment
const shouldLog = (): boolean => {
  if (typeof window !== 'undefined') {
    // Client-side: only in development
    return process.env.NODE_ENV === 'development';
  }
  // Server-side: development or DEBUG=true
  return process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
};

// Check if we're in production
const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

// Get current log level from environment
const getMinLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (['debug', 'info', 'warn', 'error'].includes(level)) {
    return level;
  }
  return isProduction() ? 'warn' : 'debug';
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLogLevel = (level: LogLevel): boolean => {
  const minLevel = getMinLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
};

// Format log entry for output
const formatLogEntry = (entry: LogEntry): string => {
  if (isProduction()) {
    // JSON format for production (easier to parse by log aggregators)
    return JSON.stringify(entry);
  }
  
  // Human-readable format for development
  const { timestamp, level, message, context, error } = entry;
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  const color = levelColors[level];
  
  let output = `${color}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }
  
  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack) {
      output += `\n  Stack: ${error.stack}`;
    }
  }
  
  return output;
};

// Create a log entry
const createLogEntry = (
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  
  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }
  
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  return entry;
};

// Output log entry to console
const outputLog = (entry: LogEntry): void => {
  if (!shouldLog() && !isProduction()) return;
  if (!shouldLogLevel(entry.level)) return;
  
  const formatted = formatLogEntry(entry);
  
  switch (entry.level) {
    case 'debug':
    case 'info':
      // In production, we might want to suppress these
      if (!isProduction()) {
        // eslint-disable-next-line no-console
        console.log(formatted);
      }
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(formatted);
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(formatted);
      // Future: Send to error monitoring service
      // sendToErrorMonitoring(entry);
      break;
  }
};

/**
 * Structured logger for ProMan application
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/utils/logger';
 * 
 * logger.debug('Debug message', { userId: 123 });
 * logger.info('User logged in', { email: 'user@example.com' });
 * logger.warn('Rate limit approaching', { current: 95, limit: 100 });
 * logger.error('Failed to save', new Error('Database error'), { recordId: 456 });
 * ```
 */
export const logger = {
  /**
   * Log debug information (development only)
   */
  debug: (message: string, context?: LogContext): void => {
    const entry = createLogEntry('debug', message, context);
    outputLog(entry);
  },
  
  /**
   * Log general information
   */
  info: (message: string, context?: LogContext): void => {
    const entry = createLogEntry('info', message, context);
    outputLog(entry);
  },
  
  /**
   * Log warnings
   */
  warn: (message: string, context?: LogContext): void => {
    const entry = createLogEntry('warn', message, context);
    outputLog(entry);
  },
  
  /**
   * Log errors with optional Error object
   */
  error: (message: string, error?: Error | unknown, context?: LogContext): void => {
    const err = error instanceof Error ? error : undefined;
    const entry = createLogEntry('error', message, context, err);
    outputLog(entry);
    
    // If error is not an Error instance, include it in context
    if (error && !(error instanceof Error)) {
      entry.context = { ...entry.context, rawError: String(error) };
    }
    
    outputLog(entry);
  },
  
  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) => 
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => 
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) => 
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) => 
      logger.error(message, error, { ...baseContext, ...context }),
  }),
};

// Export types for consumers
export type { LogLevel, LogContext, LogEntry };
