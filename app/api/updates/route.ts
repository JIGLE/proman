import { NextResponse } from 'next/server';

// Webhook endpoint is disabled by default. To re-enable, set env `UPDATE_WEBHOOK_ENABLED=true`.
// The implementation was removed to avoid accepting remote updates while you prefer manual updates.

export async function GET() {
  if (process.env.UPDATE_WEBHOOK_ENABLED === 'true') {
    return NextResponse.json({ ok: false, error: 'webhook not implemented (placeholder)' }, { status: 501 });
  }
  return NextResponse.json({ ok: false, error: 'webhook disabled' }, { status: 503 });
}

export async function POST() {
  if (process.env.UPDATE_WEBHOOK_ENABLED === 'true') {
    return NextResponse.json({ ok: false, error: 'webhook not implemented (placeholder)' }, { status: 501 });
  }
  return NextResponse.json({ ok: false, error: 'webhook disabled' }, { status: 503 });
}
