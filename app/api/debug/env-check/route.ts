import { NextResponse } from 'next/server'

// Ensure this runs in Node runtime
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    console.warn('[env-check] This endpoint is disabled in production for security')
    return NextResponse.json({
      error: 'Environment check endpoint is disabled in production'
    }, { status: 403 })
  }

  const envStatus = {
    // NextAuth configuration
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✓ Set' : '✗ Missing',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Missing',

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing',

    // Database
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Missing',

    // Environment
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Auth debugging
    NEXTAUTH_ALLOW_DB_FAILURE: process.env.NEXTAUTH_ALLOW_DB_FAILURE || 'false',
    ALLOW_AUTH_RESET: process.env.ALLOW_AUTH_RESET || 'false',
    ALLOW_ENV_CHECK: process.env.ALLOW_ENV_CHECK || 'false',
  }

  // Check if Google credentials look valid (basic format check)
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  if (googleClientId && googleClientId.length > 10 && !googleClientId.includes('dummy')) {
    envStatus.GOOGLE_CLIENT_ID = '✓ Set (appears valid)'
  } else if (googleClientId === 'dummy-client-id') {
    envStatus.GOOGLE_CLIENT_ID = '⚠️ Using dummy value'
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: envStatus,
    recommendations: {
      required: [
        'NEXTAUTH_URL - Should match your domain',
        'NEXTAUTH_SECRET - Random secure string',
        'GOOGLE_CLIENT_ID - From Google Cloud Console',
        'GOOGLE_CLIENT_SECRET - From Google Cloud Console',
        'DATABASE_URL - SQLite path or PostgreSQL connection'
      ],
      optional: [
        'NEXTAUTH_ALLOW_DB_FAILURE - Set to "true" for testing',
        'ALLOW_AUTH_RESET - Set to "true" to enable auth reset endpoint',
        'ALLOW_ENV_CHECK - Set to "true" to enable this endpoint'
      ]
    }
  })
}