import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import crypto from 'crypto';

function makeSig(secret: string, raw: string) {
  return `sha256=${crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex')}`;
}

describe('app/api/updates/route.ts POST/GET', () => {
  beforeEach(() => {
    vi.resetModules();
    // mock fs functions to avoid real file IO
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined as unknown as void);
    vi.spyOn(fs, 'renameSync').mockImplementation(() => undefined as unknown as void);
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined as unknown as void);
  });

  it('accepts POST with valid X-Hub-Signature-256 and populates cache', async () => {
    process.env.UPDATE_WEBHOOK_SECRET = 's3cret';
    const payload = { tag_name: 'v1.2.3' };
    const raw = JSON.stringify(payload);
    const sig = makeSig(process.env.UPDATE_WEBHOOK_SECRET!, raw);

    const { POST, GET } = await import('../../app/api/updates/route.ts');

    const req = {
      text: async () => raw,
      headers: { get: (n: string) => (n.toLowerCase() === 'x-hub-signature-256' ? sig : null) },
    } as unknown as Request;

    const postRes = await POST(req);
    const postBody = await postRes.json();
    expect(postBody.ok).toBe(true);

    const getRes = await GET();
    const getBody = await getRes.json();
    expect(getBody.ok).toBe(true);
    expect(getBody.data.tag_name).toBe('v1.2.3');
  });

  it('rejects POST with invalid signature', async () => {
    process.env.UPDATE_WEBHOOK_SECRET = 's3cret';
    const payload = { tag_name: 'v9.9.9' };
    const raw = JSON.stringify(payload);

    const { POST } = await import('../../app/api/updates/route.ts');

    const req = {
      text: async () => raw,
      headers: { get: (_: string) => 'sha256=deadbeef' },
    } as unknown as Request;

    const postRes = await POST(req);
    const postBody = await postRes.json();
    expect(postBody.ok).toBe(false);
    expect(postRes.status).toBe(401);
  });

  it('accepts Bearer fallback when signature missing', async () => {
    process.env.UPDATE_WEBHOOK_SECRET = 's3cret';
    const payload = { tag_name: 'v2.0.0' };
    const raw = JSON.stringify(payload);

    const { POST, GET } = await import('../../app/api/updates/route.ts');

    const req = {
      text: async () => raw,
      headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${process.env.UPDATE_WEBHOOK_SECRET}` : null) },
    } as unknown as Request;

    const postRes = await POST(req);
    const postBody = await postRes.json();
    expect(postBody.ok).toBe(true);

    const getRes = await GET();
    const getBody = await getRes.json();
    expect(getBody.ok).toBe(true);
    expect(getBody.data.tag_name).toBe('v2.0.0');
  });

  it('returns 400 for missing tag_name', async () => {
    process.env.UPDATE_WEBHOOK_SECRET = 's3cret';
    const payload = { not_a_tag: true };
    const raw = JSON.stringify(payload);
    const sig = makeSig(process.env.UPDATE_WEBHOOK_SECRET!, raw);

    const { POST } = await import('../../app/api/updates/route.ts');

    const req = {
      text: async () => raw,
      headers: { get: (n: string) => (n.toLowerCase() === 'x-hub-signature-256' ? sig : null) },
    } as unknown as Request;

    const postRes = await POST(req);
    const postBody = await postRes.json();
    expect(postRes.status).toBe(400);
    expect(postBody.ok).toBe(false);
  });
});
