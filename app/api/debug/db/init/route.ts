import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Optional protection: set INIT_SECRET env var and send Authorization: Bearer <INIT_SECRET>
  const initSecret = process.env.INIT_SECRET
  if (initSecret) {
    const auth = request.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== initSecret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || !dbUrl.startsWith('file:')) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured for sqlite' }, { status: 400 })
  }

  const dbPath = dbUrl.replace(/^file:\/\//, '').replace(/^file:/, '')
  const resolved = path.resolve(process.cwd(), dbPath)
  const dir = path.dirname(resolved)

  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: `failed to create directory: ${message}` }, { status: 500 })
  }

  try {
    const fd = fs.openSync(resolved, 'a')
    fs.closeSync(fd)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: `failed to create file: ${message}` }, { status: 500 })
  }

  try {
    fs.accessSync(resolved, fs.constants.W_OK)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: `db file not writable: ${message}` }, { status: 500 })
  }

  try {
    // Run prisma commands and capture output
    const pushOut = execSync('npx prisma db push', { stdio: 'pipe' }).toString()
    const genOut = execSync('npx prisma generate', { stdio: 'pipe' }).toString()
    return NextResponse.json({ ok: true, dbPath: resolved, pushOut, genOut })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Attempt to extract stdout/stderr if present (common for child_process errors)
    const maybeErr = err as { stdout?: unknown; stderr?: unknown };
    const stdout = typeof maybeErr.stdout === 'string' ? maybeErr.stdout : typeof maybeErr.stdout === 'object' && maybeErr.stdout?.toString ? maybeErr.stdout.toString() : undefined;
    const stderr = typeof maybeErr.stderr === 'string' ? maybeErr.stderr : typeof maybeErr.stderr === 'object' && maybeErr.stderr?.toString ? maybeErr.stderr.toString() : undefined;
    return NextResponse.json({ ok: false, error: message, stdout, stderr }, { status: 500 });
  }
}
