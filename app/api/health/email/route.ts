import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // Check SendGrid configuration
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.FROM_EMAIL
    
    const hasApiKey = !!apiKey && apiKey.length > 0
    const hasFromEmail = !!fromEmail && fromEmail.includes('@')
    const isConfigured = hasApiKey && hasFromEmail
    
    if (!isConfigured) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          provider: 'sendgrid',
          configured: false,
          issues: [
            !hasApiKey && 'Missing SENDGRID_API_KEY',
            !hasFromEmail && 'Missing or invalid FROM_EMAIL'
          ].filter(Boolean),
          response_time_ms: Date.now() - startTime
        },
        { status: 200 } // Return 200 but mark as degraded (non-blocking)
      )
    }
    
    // Configuration is valid
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        provider: 'sendgrid',
        configured: true,
        from_email: fromEmail,
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
    console.error('Email health check failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown email service error',
        response_time_ms: Date.now() - startTime
      },
      { status: 503 }
    )
  }
}
