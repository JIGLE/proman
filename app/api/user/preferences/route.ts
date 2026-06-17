import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { getPrismaClient } from '@/lib/services/database';

export const runtime = 'nodejs';

const SUPPORTED_CURRENCIES = ['EUR', 'DKK', 'USD', 'GBP'] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;
    const prisma = getPrismaClient();
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    return NextResponse.json({ preferredCurrency: settings?.defaultCurrency ?? null });
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
    if (
      !preferredCurrency ||
      typeof preferredCurrency !== 'string' ||
      !SUPPORTED_CURRENCIES.includes(preferredCurrency as SupportedCurrency)
    ) {
      return NextResponse.json(
        { error: `Invalid preferredCurrency. Supported: ${SUPPORTED_CURRENCIES.join(', ')}` },
        { status: 400 }
      );
    }
    const currency = preferredCurrency as SupportedCurrency;
    const prisma = getPrismaClient();
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: { defaultCurrency: currency },
      create: { userId, defaultCurrency: currency },
    });
    return NextResponse.json({ success: true, preferredCurrency: settings.defaultCurrency });
  } catch (err) {
    console.error('Error saving user preferences:', err);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

export const OPTIONS = handleOptions;
