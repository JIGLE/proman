/**
 * Performance Monitoring Utilities
 * 
 * Tracks application performance metrics including:
 * - Page load times
 * - API response times
 * - Database query performance
 * - Resource loading
 * - Web Vitals (LCP, FID, CLS)
 */

import { logger } from '@/lib/utils/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'score';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface TimingMetric {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Store for aggregating metrics
class MetricsStore {
  private metrics: PerformanceMetric[] = [];
  private timings: TimingMetric[] = [];
  private readonly maxSize = 100; // Keep last 100 metrics in memory

  add(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxSize) {
      this.metrics.shift();
    }
  }

  addTiming(timing: TimingMetric): void {
    this.timings.push(timing);
    if (this.timings.length > this.maxSize) {
      this.timings.shift();
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getTimings(): TimingMetric[] {
    return [...this.timings];
  }

  getAverageByName(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  clear(): void {
    this.metrics = [];
    this.timings = [];
  }
}

const metricsStore = new MetricsStore();

/**
 * Record a performance metric
 */
export function recordMetric(
  name: string,
  value: number,
  unit: 'ms' | 'bytes' | 'score' = 'ms',
  metadata?: Record<string, unknown>
): void {
  const metric: PerformanceMetric = {
    name,
    value,
    unit,
    timestamp: Date.now(),
    metadata,
  };

  metricsStore.add(metric);

  // Log significant metrics
  if (shouldLogMetric(name, value, unit)) {
    logger.info(`Performance metric: ${name}`, {
      value,
      unit,
      ...metadata,
    });
  }
}

/**
 * Determine if a metric should be logged
 */
function shouldLogMetric(name: string, value: number, unit: string): boolean {
  // Log slow operations
  if (unit === 'ms') {
    // API calls over 1s
    if (name.includes('api') && value > 1000) return true;
    // Database queries over 500ms
    if (name.includes('db') && value > 500) return true;
    // Page loads over 3s
    if (name.includes('page') && value > 3000) return true;
  }
  
  // Log poor Web Vitals scores
  if (unit === 'score' && value < 0.75) return true;
  
  return false;
}

/**
 * Timer utility for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private metadata?: Record<string, unknown>;

  constructor(operation: string, metadata?: Record<string, unknown>) {
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End the timer and record the duration
   */
  end(success: boolean = true, error?: string): number {
    const duration = performance.now() - this.startTime;
    
    const timing: TimingMetric = {
      operation: this.operation,
      duration,
      success,
      error,
      metadata: this.metadata,
    };

    metricsStore.addTiming(timing);

    // Record as metric
    recordMetric(this.operation, duration, 'ms', {
      success,
      error,
      ...this.metadata,
    });

    return duration;
  }

  /**
   * Get elapsed time without ending the timer
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Decorator/wrapper for measuring async function performance
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const timer = new PerformanceTimer(operation, metadata);
  
  try {
    const result = await fn();
    timer.end(true);
    return result;
  } catch (error) {
    timer.end(false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Measure sync function performance
 */
export function measureSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const timer = new PerformanceTimer(operation, metadata);
  
  try {
    const result = fn();
    timer.end(true);
    return result;
  } catch (error) {
    timer.end(false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Client-side Web Vitals tracking
 */
export function trackWebVitals(): void {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals if API is available
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
      const lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
      
      recordMetric('web-vitals-lcp', lcp, 'ms', {
        rating: lcp < 2500 ? 'good' : lcp < 4000 ? 'needs-improvement' : 'poor',
      });
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const processingStart = (entry as PerformanceEventTiming).processingStart || 0;
        const fid = processingStart - entry.startTime;
        
        recordMetric('web-vitals-fid', fid, 'ms', {
          rating: fid < 100 ? 'good' : fid < 300 ? 'needs-improvement' : 'poor',
        });
      });
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as LayoutShift).hadRecentInput) {
          clsValue += (entry as LayoutShift).value;
        }
      });
      
      recordMetric('web-vitals-cls', clsValue, 'score', {
        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
      });
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }
  }

  // Track page load performance
  if ('performance' in window && window.performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstPaint = timing.responseEnd - timing.fetchStart;

        recordMetric('page-load-total', loadTime, 'ms');
        recordMetric('page-load-dom-ready', domReady, 'ms');
        recordMetric('page-load-first-paint', firstPaint, 'ms');
      }, 0);
    });
  }
}

/**
 * Get all collected metrics
 */
export function getMetrics(): {
  metrics: PerformanceMetric[];
  timings: TimingMetric[];
  averages: Record<string, number>;
} {
  const metrics = metricsStore.getMetrics();
  const timings = metricsStore.getTimings();
  
  // Calculate averages for common operations
  const averages: Record<string, number> = {};
  const uniqueNames = new Set(metrics.map(m => m.name));
  
  uniqueNames.forEach(name => {
    averages[name] = metricsStore.getAverageByName(name);
  });

  return { metrics, timings, averages };
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  metricsStore.clear();
}

// Type definitions for PerformanceObserver entries
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart?: number;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}
