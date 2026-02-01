import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/services/database/database'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  try {
    // Test database connectivity
    const prisma = getPrismaClient()
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json(
      { status: 'ok', db: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    console.error('Health check failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { status: 'error', db: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
