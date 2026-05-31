import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { getPrismaClient } from '@/lib/database';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ preferredCurrency: user.preferredCurrency || null });
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;
    const body = await req.json();
    const preferredCurrency = body?.preferredCurrency;
    if (!preferredCurrency || typeof preferredCurrency !== 'string' || !/^[A-Z]{3}$/.test(preferredCurrency)) {
      return NextResponse.json({ error: 'Invalid preferredCurrency' }, { status: 400 });
    }
    const prisma = getPrismaClient();
    const updated = await prisma.user.update({ where: { id: userId }, data: { preferredCurrency } });
    return NextResponse.json({ success: true, preferredCurrency: updated.preferredCurrency });
  } catch (err) {
    console.error('Error saving user preferences:', err);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

export const OPTIONS = handleOptions;
