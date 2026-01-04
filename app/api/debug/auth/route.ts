import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/database'

export const runtime = 'nodejs'

export async function GET() {
  const info: any = {
    ok: false,
    nextauthUrlOk: false,
    googleConfigured: false,
    db: {
      ok: false,
      userCount: null,
      error: null,
    },
    timestamp: new Date().toISOString(),
  }

  try {
    const nextauthUrl = process.env.NEXTAUTH_URL
    info.nextauthUrlOk = !!nextauthUrl && nextauthUrl === 'https://proman.mj25.eu'
    info.googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

    // DB check via Prisma
    try {
      const prisma = getPrismaClient()
      const count = await prisma.user.count()
      info.db.ok = true
      info.db.userCount = count
    } catch (err: any) {
      info.db.ok = false
      info.db.error = err?.message || String(err)
    }

    info.ok = info.nextauthUrlOk && info.googleConfigured && info.db.ok
    return NextResponse.json(info)
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 })
  }
}