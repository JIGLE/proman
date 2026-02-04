/**
 * Application Metrics Collection
 * 
 * Tracks business and application metrics:
 * - User activity (logins, actions)
 * - Feature usage
 * - Business metrics (properties created, tenants added, etc.)
 * - System health indicators
 */

import { logger } from '@/lib/utils/logger';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram';
}

export interface CounterMetric extends Metric {
  type: 'counter';
}

export interface GaugeMetric extends Metric {
  type: 'gauge';
}

export interface HistogramMetric extends Metric {
  type: 'histogram';
  buckets?: number[];
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private metrics: Metric[] = [];
  private readonly maxMetrics = 1000;

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    const newValue = current + value;
    this.counters.set(name, newValue);

    this.recordMetric({
      name,
      value: newValue,
      timestamp: Date.now(),
      tags,
      type: 'counter',
    });
  }

  /**
   * Decrement a counter metric
   */
  decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }

  /**
   * Set a gauge metric (current value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);

    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'gauge',
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    
    // Keep only last 100 values per histogram
    if (values.length > 100) {
      values.shift();
    }
    
    this.histograms.set(name, values);

    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'histogram',
    });
  }

  /**
   * Get current counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get current gauge value
   */
  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sum / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Record metric for export
   */
  private recordMetric(metric: Metric): void {
    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log significant metrics
    if (this.shouldLogMetric(metric)) {
      logger.info(`Metric: ${metric.name}`, {
        value: metric.value,
        type: metric.type,
        tags: metric.tags,
      });
    }
  }

  /**
   * Determine if metric should be logged
   */
  private shouldLogMetric(metric: Metric): boolean {
    // Log all errors
    if (metric.name.includes('error')) return true;
    
    // Log high-value business metrics
    const businessMetrics = [
      'user.login',
      'property.created',
      'tenant.added',
      'payment.processed',
    ];
    
    if (businessMetrics.some(m => metric.name.startsWith(m))) return true;
    
    return false;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Get all counters
   */
  getCounters(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  /**
   * Get all gauges
   */
  getGauges(): Record<string, number> {
    return Object.fromEntries(this.gauges);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.metrics = [];
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    this.counters.forEach((value, name) => {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    });

    // Export gauges
    this.gauges.forEach((value, name) => {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    });

    // Export histograms
    this.histograms.forEach((values, name) => {
      const stats = this.getHistogramStats(name);
      if (stats) {
        lines.push(`# TYPE ${name} histogram`);
        lines.push(`${name}_count ${stats.count}`);
        lines.push(`${name}_sum ${stats.avg * stats.count}`);
        lines.push(`${name}{quantile="0.5"} ${stats.p50}`);
        lines.push(`${name}{quantile="0.95"} ${stats.p95}`);
        lines.push(`${name}{quantile="0.99"} ${stats.p99}`);
      }
    });

    return lines.join('\n');
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

// Export functions
export const metrics = {
  /**
   * Increment a counter
   */
  increment: (name: string, value?: number, tags?: Record<string, string>) =>
    metricsCollector.increment(name, value, tags),

  /**
   * Decrement a counter
   */
  decrement: (name: string, value?: number, tags?: Record<string, string>) =>
    metricsCollector.decrement(name, value, tags),

  /**
   * Set a gauge value
   */
  gauge: (name: string, value: number, tags?: Record<string, string>) =>
    metricsCollector.gauge(name, value, tags),

  /**
   * Record a histogram value
   */
  histogram: (name: string, value: number, tags?: Record<string, string>) =>
    metricsCollector.histogram(name, value, tags),

  /**
   * Get counter value
   */
  getCounter: (name: string) => metricsCollector.getCounter(name),

  /**
   * Get gauge value
   */
  getGauge: (name: string) => metricsCollector.getGauge(name),

  /**
   * Get histogram stats
   */
  getHistogramStats: (name: string) => metricsCollector.getHistogramStats(name),

  /**
   * Get all metrics
   */
  getMetrics: () => metricsCollector.getMetrics(),

  /**
   * Get all counters
   */
  getCounters: () => metricsCollector.getCounters(),

  /**
   * Get all gauges
   */
  getGauges: () => metricsCollector.getGauges(),

  /**
   * Reset all metrics
   */
  reset: () => metricsCollector.reset(),

  /**
   * Export in Prometheus format
   */
  exportPrometheus: () => metricsCollector.exportPrometheus(),
};

// Common metric helpers
export const userMetrics = {
  login: (userId: string) => metrics.increment('user.login', 1, { userId }),
  logout: (userId: string) => metrics.increment('user.logout', 1, { userId }),
  signUp: () => metrics.increment('user.signup', 1),
};

export const propertyMetrics = {
  created: (userId: string) => metrics.increment('property.created', 1, { userId }),
  updated: (userId: string) => metrics.increment('property.updated', 1, { userId }),
  deleted: (userId: string) => metrics.increment('property.deleted', 1, { userId }),
};

export const tenantMetrics = {
  added: (propertyId: string) => metrics.increment('tenant.added', 1, { propertyId }),
  removed: (propertyId: string) => metrics.increment('tenant.removed', 1, { propertyId }),
};

export const apiMetrics = {
  request: (endpoint: string, method: string) => 
    metrics.increment('api.request', 1, { endpoint, method }),
  success: (endpoint: string, method: string) => 
    metrics.increment('api.success', 1, { endpoint, method }),
  error: (endpoint: string, method: string, statusCode: string) => 
    metrics.increment('api.error', 1, { endpoint, method, statusCode }),
  responseTime: (endpoint: string, duration: number) => 
    metrics.histogram('api.response_time', duration, { endpoint }),
};

export const dbMetrics = {
  query: (model: string, operation: string) => 
    metrics.increment('db.query', 1, { model, operation }),
  queryTime: (model: string, duration: number) => 
    metrics.histogram('db.query_time', duration, { model }),
  error: (model: string, operation: string) => 
    metrics.increment('db.error', 1, { model, operation }),
};
