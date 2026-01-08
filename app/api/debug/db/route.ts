import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getPrismaClient } from '@/lib/database'

// Ensure this runs in Node runtime so we can access filesystem and Prisma
export const runtime = 'nodejs'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 400 })
  }

  const info: Record<string, any> = {
    ok: false,
    database: {
      url: dbUrl.startsWith('file:') ? 'sqlite' : dbUrl.startsWith('postgres') || dbUrl.startsWith('postgresql') ? 'postgres' : 'unknown',
      exists: null,
      writable: null,
      userCount: null,
      error: null,
    },
    timestamp: new Date().toISOString(),
  }

  // If SQLite, check file existence and writability
  if (dbUrl.startsWith('file:')) {
    try {
      let dbPath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '')
      const resolved = path.resolve(process.cwd(), dbPath)
      info.database.path = resolved

      try {
        await fs.promises.access(resolved, fs.constants.F_OK)
        info.database.exists = true
      } catch {
        info.database.exists = false
      }

      try {
        await fs.promises.access(resolved, fs.constants.W_OK)
        info.database.writable = true
      } catch {
        info.database.writable = false
      }
    } catch (err: unknown) {
      info.database.error = `Filesystem check failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // Try to contact database via Prisma to get a user count
  try {
    const prisma = getPrismaClient()
    const count = await prisma.user.count()
    info.database.userCount = count
    info.ok = true
  } catch (err: any) {
    info.database.error = info.database.error ? `${info.database.error}; ${err?.message}` : err?.message
  }

  return NextResponse.json(info)
}
