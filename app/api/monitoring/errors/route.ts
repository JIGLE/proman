/**
 * Error Tracking API Endpoint
 * 
 * GET /api/monitoring/errors - Get recent errors (development only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentErrors, getErrorStats } from '@/lib/monitoring/error-tracker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get('count') || '10', 10);
  const statsOnly = url.searchParams.get('stats') === 'true';

  if (statsOnly) {
    const stats = getErrorStats();
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats,
    });
  }

  const errors = getRecentErrors(count);
  const stats = getErrorStats();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    count: errors.length,
    stats,
    errors: errors.map(err => ({
      id: err.id,
      timestamp: new Date(err.timestamp).toISOString(),
      message: err.error.message,
      name: err.error.name,
      severity: err.severity,
      handled: err.handled,
      component: err.context?.component,
      action: err.context?.action,
      stack: process.env.NODE_ENV === 'development' ? err.error.stack : undefined,
    })),
  });
}
