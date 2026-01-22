import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getPrismaClient } from '@/lib/database'

// Ensure this runs in Node runtime so we can access filesystem and Prisma
export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 400 })
  }

  type DebugDBInfo = {
    ok: boolean;
    database: {
      url: string;
      path?: string;
      exists: boolean | null;
      writable: boolean | null;
      userCount: number | null;
      users?: any[];
      accounts?: any[];
      sessionCount?: number;
      error: string | null;
    };
    timestamp: string;
  };

  const info: DebugDBInfo = {
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

  // Try to contact database via Prisma to get detailed user/account info
  try {
    const prisma = getPrismaClient()
    const userCount = await prisma.user.count()
    info.database.userCount = userCount

    // Get detailed user and account information for OAuth debugging
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            accounts: true,
            properties: true,
            leases: true,
          }
        }
      }
    })

    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        provider: true,
        providerAccountId: true,
      }
    })

    const sessions = await prisma.session.count()

    info.database.users = users
    info.database.accounts = accounts
    info.database.sessionCount = sessions
    info.ok = true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    info.database.error = info.database.error ? `${info.database.error}; ${message}` : message;
  }

  return NextResponse.json(info)
}
