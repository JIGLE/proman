import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/services/database/database'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // Test database connectivity
    const prisma = getPrismaClient()
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart
    
    // Check email service configuration
    const emailConfigured = !!(process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL)
    
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: {
            status: 'healthy',
            latency_ms: dbLatency
          },
          email: {
            status: emailConfigured ? 'configured' : 'not_configured',
            provider: 'sendgrid'
          }
        },
        response_time_ms: Date.now() - startTime
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Health check failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        response_time_ms: Date.now() - startTime
      },
      { status: 503 }
    )
  }
}
