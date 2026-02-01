import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/services/database/database'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    const prisma = getPrismaClient()
    
    // Test query latency
    const queryStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const queryLatency = Date.now() - queryStart
    
    // Test transaction
    const txStart = Date.now()
    await prisma.$transaction([prisma.$queryRaw`SELECT 1`])
    const txLatency = Date.now() - txStart
    
    // Get connection metrics (Prisma doesn't expose pool stats directly)
    // These are estimates based on query performance
    const metrics = {
      query_latency_ms: queryLatency,
      transaction_latency_ms: txLatency,
      connection_status: 'active'
    }
    
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          type: 'sqlite',
          metrics
        },
        response_time_ms: Date.now() - startTime
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  } catch (error) {
    console.error('Database health check failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown database error',
        response_time_ms: Date.now() - startTime
      },
      { status: 503 }
    )
  }
}
