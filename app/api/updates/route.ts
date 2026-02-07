import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const CACHE_TTL = 1000 * 60 * 15; // 15 minutes
const DEFAULT_MOUNT_PATHS = ['/app/data', '/data'];
const CACHE_FILE_NAME = 'latest-release.json';

interface ReleaseInfo {
  tag_name: string;
  name?: string;
  html_url?: string;
  body?: string;
  published_at?: string;
  fetchedAt?: number;
}

function getPersistencePath(): string {
  const envPath = process.env.PERSISTENCE_MOUNT_PATH;
  if (envPath) return envPath;

  for (const p of DEFAULT_MOUNT_PATHS) {
    try {
      fs.accessSync(p);
      return p;
    } catch {
      // ignore
    }
  }
  // Fallback to app cwd
  return process.cwd();
}

function cacheFilePath(): string {
  return path.join(getPersistencePath(), CACHE_FILE_NAME);
}

function readCachedRelease(): ReleaseInfo | null {
  try {
    const fp = cacheFilePath();
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(raw) as ReleaseInfo;
    return parsed;
  } catch (err) {
    console.debug('Failed reading cached release:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

function writeCachedRelease(info: ReleaseInfo): void {
  try {
    const fp = cacheFilePath();
    const tmp = `${fp}.tmp.${Date.now()}`;
    const payload = JSON.stringify({ ...info, fetchedAt: Date.now() });
    fs.writeFileSync(tmp, payload, { encoding: 'utf8' });
    try {
      fs.renameSync(tmp, fp);
    } catch (err) {
      // Best effort: attempt to remove tmp and write directly as fallback
      try {
        fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
      fs.writeFileSync(fp, payload, { encoding: 'utf8' });
    }
  } catch (err) {
    console.warn('Failed to write release cache:', err instanceof Error ? err.message : String(err));
  }
}

let inMemoryCache: ReleaseInfo | null = null;

function computeSignature(secret: string, body: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
}

function safeCompare(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

async function fetchLatestFromGitHub(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch('https://api.github.com/repos/JIGLE/proman/releases/latest', {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const info: ReleaseInfo = {
      tag_name: data.tag_name,
      name: data.name,
      html_url: data.html_url,
      body: data.body,
      published_at: data.published_at,
      fetchedAt: Date.now(),
    };
    writeCachedRelease(info);
    inMemoryCache = info;
    return info;
  } catch (err) {
    console.error('Failed to fetch GitHub latest release:', err);
    return null;
  }
}

export async function GET() {
  // Serve cached if fresh
  if (inMemoryCache && Date.now() - (inMemoryCache.fetchedAt || 0) < CACHE_TTL) {
    return NextResponse.json({ ok: true, data: inMemoryCache });
  }

  // Try file cache
  const fileCache = readCachedRelease();
  if (fileCache && Date.now() - (fileCache.fetchedAt || 0) < CACHE_TTL) {
    inMemoryCache = fileCache;
    return NextResponse.json({ ok: true, data: fileCache });
  }

  // Fetch from GitHub
  const fetched = await fetchLatestFromGitHub();
  if (fetched) return NextResponse.json({ ok: true, data: fetched });

  // Last resort: return file cache even if stale
  if (fileCache) return NextResponse.json({ ok: true, data: fileCache });

  return NextResponse.json({ ok: false, error: 'no release data available' }, { status: 404 });
}

export async function POST(request: Request) {
  const secret = process.env.UPDATE_WEBHOOK_SECRET;

  // Read raw body for HMAC verification and safe parsing
  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error('Failed to read raw request body:', err);
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  // Verify HMAC signature if secret is configured
  const sigHeader = request.headers.get('x-hub-signature-256') || '';
  let authorized = false;
  if (secret && sigHeader) {
    const computed = computeSignature(secret, rawBody);
    if (safeCompare(computed, sigHeader)) authorized = true;
  }

  // Backwards-compatible: allow Bearer token matching secret
  if (!authorized && secret) {
    const auth = request.headers.get('authorization') || '';
    const isBearer = auth.startsWith('Bearer ') && auth.slice(7) === secret;
    if (isBearer) authorized = true;
  }

  if (secret && !authorized) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Parse payload from raw body and validate minimal fields
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (err) {
    console.error('Failed to parse JSON payload:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  const tag = payload.tag_name || payload.tag || payload.release?.tag_name || payload.release?.tag;
  if (!tag) {
    // Accepting some webhook formats but require at least tag name
    return NextResponse.json({ ok: false, error: 'missing tag_name' }, { status: 400 });
  }

  try {
    const info: ReleaseInfo = {
      tag_name: tag,
      name: payload.name || payload.release?.name,
      html_url: payload.html_url || payload.release?.html_url,
      body: payload.body || payload.release?.body,
      published_at: payload.published_at || payload.release?.published_at,
      fetchedAt: Date.now(),
    };
    writeCachedRelease(info);
    inMemoryCache = info;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to accept update notify payload:', err);
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }
}
