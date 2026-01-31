import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { analyticsService } from '@/lib/analytics-service';
import { z } from 'zod';

// Validation schema for analytics request
const analyticsRequestSchema = z.object({
  type: z.enum(['dashboard', 'kpis', 'revenue', 'occupancy', 'performance', 'leases', 'maintenance', 'activities']).default('dashboard'),
  months: z.coerce.number().min(1).max(24).default(12),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// GET /api/analytics - Get analytics data
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  const { searchParams } = new URL(request.url);
  const params = analyticsRequestSchema.parse({
    type: searchParams.get('type') || 'dashboard',
    months: searchParams.get('months') || 12,
    limit: searchParams.get('limit') || 10,
  });

  switch (params.type) {
    case 'dashboard':
      const dashboardData = await analyticsService.getDashboardAnalytics(userId);
      return createSuccessResponse(dashboardData);

    case 'kpis':
      const kpis = await analyticsService.getKPIMetrics(userId);
      return createSuccessResponse(kpis);

    case 'revenue':
      const revenue = await analyticsService.getRevenueByMonth(userId, params.months);
      return createSuccessResponse(revenue);

    case 'occupancy':
      const occupancy = await analyticsService.getOccupancyTrend(userId, params.months);
      return createSuccessResponse(occupancy);

    case 'performance':
      const performance = await analyticsService.getPropertyPerformance(userId);
      return createSuccessResponse(performance);

    case 'leases':
      const leases = await analyticsService.getLeaseExpirations(userId);
      return createSuccessResponse(leases);

    case 'maintenance':
      const maintenance = await analyticsService.getMaintenanceStats(userId);
      return createSuccessResponse(maintenance);

    case 'activities':
      const activities = await analyticsService.getRecentActivities(userId, params.limit);
      return createSuccessResponse(activities);

    default:
      return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  return withErrorHandler(handleGet)(request);
}

export async function OPTIONS() {
  return handleOptions();
}
