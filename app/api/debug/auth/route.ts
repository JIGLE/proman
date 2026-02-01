import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/services/database/database'

export const runtime = 'nodejs'

type DebugAuthInfo = {
  ok: boolean;
  nextauthUrlOk: boolean;
  googleConfigured: boolean;
  db: { ok: boolean; userCount: number | null; error: string | null };
  timestamp: string;
};

export async function GET(): Promise<NextResponse> {
  const info: DebugAuthInfo = {
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
    info.nextauthUrlOk = !!nextauthUrl && nextauthUrl.startsWith('http')
    info.googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

    // DB check via Prisma
    try {
      const prisma = getPrismaClient()
      const count = await prisma.user.count()
      info.db.ok = true
      info.db.userCount = count
    } catch (err: unknown) {
      info.db.ok = false
      info.db.error = err instanceof Error ? err.message : String(err)
    }

    info.ok = info.nextauthUrlOk && info.googleConfigured && info.db.ok
    return NextResponse.json(info)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
