import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/database'

// Ensure this runs in Node runtime
export const runtime = 'nodejs'

export async function POST(): Promise<NextResponse> {
  try {
    // Disable in production — this is a dangerous endpoint
    if (process.env.NODE_ENV === 'production') {
      console.error('[auth-reset] This endpoint is disabled in production for security')
      return NextResponse.json({
        error: 'Auth reset endpoint is disabled in production'
      }, { status: 403 })
    }

    const prisma = getPrismaClient()

    // Delete all OAuth-related data but keep user data
    await prisma.account.deleteMany()
    await prisma.session.deleteMany()
    await prisma.verificationToken.deleteMany()

    // Log what was reset
    console.debug('OAuth data reset completed')

    return NextResponse.json({
      success: true,
      message: 'OAuth account linking data has been reset. Try logging in again.',
      reset: {
        accounts: 'cleared',
        sessions: 'cleared',
        verificationTokens: 'cleared'
      }
    })
  } catch (error) {
    console.error('Auth reset failed:', error)
    return NextResponse.json({
      error: 'Failed to reset auth data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
