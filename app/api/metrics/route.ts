import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/services/database/database'

export const runtime = 'nodejs'

// In-memory metrics store
interface MetricsStore {
  http_requests_total: number
  http_errors_total: number
  db_queries_total: number
  email_sent_total: number
  email_failed_total: number
  last_reset: number
}

// Simple in-memory metrics (resets on restart - for production use Redis or proper metrics DB)
const metrics: MetricsStore = {
  http_requests_total: 0,
  http_errors_total: 0,
  db_queries_total: 0,
  email_sent_total: 0,
  email_failed_total: 0,
  last_reset: Date.now()
}

// Helper to format Prometheus metrics
function formatPrometheusMetrics(): string {
  const lines: string[] = []
  
  lines.push('# HELP http_requests_total Total HTTP requests')
  lines.push('# TYPE http_requests_total counter')
  lines.push(`http_requests_total ${metrics.http_requests_total}`)
  lines.push('')
  
  lines.push('# HELP http_errors_total Total HTTP errors (4xx, 5xx)')
  lines.push('# TYPE http_errors_total counter')
  lines.push(`http_errors_total ${metrics.http_errors_total}`)
  lines.push('')
  
  lines.push('# HELP db_queries_total Total database queries')
  lines.push('# TYPE db_queries_total counter')
  lines.push(`db_queries_total ${metrics.db_queries_total}`)
  lines.push('')
  
  lines.push('# HELP email_sent_total Total emails sent successfully')
  lines.push('# TYPE email_sent_total counter')
  lines.push(`email_sent_total ${metrics.email_sent_total}`)
  lines.push('')
  
  lines.push('# HELP email_failed_total Total emails failed to send')
  lines.push('# TYPE email_failed_total counter')
  lines.push(`email_failed_total ${metrics.email_failed_total}`)
  lines.push('')
  
  lines.push('# HELP process_uptime_seconds Process uptime in seconds')
  lines.push('# TYPE process_uptime_seconds gauge')
  lines.push(`process_uptime_seconds ${process.uptime()}`)
  lines.push('')
  
  lines.push('# HELP metrics_reset_timestamp_seconds Unix timestamp of last metrics reset')
  lines.push('# TYPE metrics_reset_timestamp_seconds gauge')
  lines.push(`metrics_reset_timestamp_seconds ${Math.floor(metrics.last_reset / 1000)}`)
  lines.push('')
  
  return lines.join('\n')
}

export async function GET(request: Request): Promise<Response> {
  try {
    // Check if database is healthy
    const prisma = getPrismaClient()
    await prisma.$queryRaw`SELECT 1`
    
    // Check accept header for format preference
    const acceptHeader = request.headers.get('accept') || ''
    const wantsJson = acceptHeader.includes('application/json')
    
    if (wantsJson) {
      // Return JSON format
      return NextResponse.json({
        metrics: {
          http_requests_total: metrics.http_requests_total,
          http_errors_total: metrics.http_errors_total,
          db_queries_total: metrics.db_queries_total,
          email_sent_total: metrics.email_sent_total,
          email_failed_total: metrics.email_failed_total,
          process_uptime_seconds: process.uptime(),
          metrics_reset_timestamp: new Date(metrics.last_reset).toISOString()
        },
        note: 'Metrics reset on application restart. For production, use persistent storage.'
      })
    } else {
      // Return Prometheus text format
      const promMetrics = formatPrometheusMetrics()
      return new Response(promMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }
  } catch (error) {
    console.error('Metrics endpoint error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    )
  }
}

// Export metrics increment functions for use by other modules
export function incrementHttpRequests(): void {
  metrics.http_requests_total++
}

export function incrementHttpErrors(): void {
  metrics.http_errors_total++
}

export function incrementDbQueries(): void {
  metrics.db_queries_total++
}

export function incrementEmailSent(): void {
  metrics.email_sent_total++
}

export function incrementEmailFailed(): void {
  metrics.email_failed_total++
}
