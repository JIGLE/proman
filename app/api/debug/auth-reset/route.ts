import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/database'

// Ensure this runs in Node runtime
export const runtime = 'nodejs'

export async function POST(): Promise<NextResponse> {
  try {
    // Only allow in development or with explicit permission
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_AUTH_RESET !== 'true') {
      return NextResponse.json({
        error: 'Auth reset not allowed in production'
      }, { status: 403 })
    }

    const prisma = getPrismaClient()

    // Delete all OAuth-related data but keep user data
    await prisma.account.deleteMany()
    await prisma.session.deleteMany()
    await prisma.verificationToken.deleteMany()

    // Log what was reset
    console.log('OAuth data reset completed')

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