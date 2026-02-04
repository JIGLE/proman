/**
 * Health Check API Endpoint
 * 
 * GET /api/monitoring/health
 * Returns application health status
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(): Promise<NextResponse> {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      memory: 'unknown',
    },
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';
  } catch (error) {
    checks.checks.database = 'unhealthy';
    checks.status = 'unhealthy';
  }

  // Memory check
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    const heapTotalMB = memory.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    checks.checks.memory = heapUsagePercent < 90 ? 'healthy' : 'warning';
    
    (checks as { memoryUsage?: { heapUsed: string; heapTotal: string; percentage: string } }).memoryUsage = {
      heapUsed: `${heapUsedMB.toFixed(2)} MB`,
      heapTotal: `${heapTotalMB.toFixed(2)} MB`,
      percentage: `${heapUsagePercent.toFixed(2)}%`,
    };
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
