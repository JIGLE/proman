/**
 * Metrics and Monitoring API Endpoint
 * 
 * GET /api/monitoring/metrics - Get current metrics
 * GET /api/monitoring/health - Health check
 * GET /api/monitoring/errors - Get recent errors (development only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/monitoring/metrics';
import { getMetrics } from '@/lib/monitoring/performance';
import { getRecentErrors, getErrorStats } from '@/lib/monitoring/error-tracker';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/monitoring/metrics
 * Returns application metrics in JSON format
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';

    // Get all metrics
    const appMetrics = metrics.getMetrics();
    const counters = metrics.getCounters();
    const gauges = metrics.getGauges();
    const performance = getMetrics();

    // Prometheus format
    if (format === 'prometheus') {
      const prometheusData = metrics.exportPrometheus();
      return new NextResponse(prometheusData, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
      });
    }

    // JSON format (default)
    const data = {
      timestamp: new Date().toISOString(),
      metrics: {
        application: appMetrics,
        counters,
        gauges,
      },
      performance: {
        metrics: performance.metrics,
        timings: performance.timings,
        averages: performance.averages,
      },
    };

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Failed to retrieve metrics', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}
