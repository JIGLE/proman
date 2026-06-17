import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/services/auth/auth-middleware';
import { seedDemoData } from '@/lib/demo-seed';

export async function POST(req: NextRequest): Promise<Response> {
    try {
        // Restrict seeding to development or when ALLOW_DEMO_MODE=true, or require SEED_SECRET header
        const isDev = process.env.NODE_ENV === 'development';
        const allowDemoMode = process.env.ALLOW_DEMO_MODE === 'true';
        const seedSecret = process.env.SEED_SECRET;

        if (!isDev && !allowDemoMode) {
            if (!seedSecret) {
                return NextResponse.json({ error: 'Seeding disabled in this environment' }, { status: 403 });
            }
            const auth = req.headers.get('authorization') || '';
            if (!auth.startsWith('Bearer ') || auth.slice(7) !== seedSecret) {
                return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
            }
        }

        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;
        const { userId } = authResult;

        // Force seed
        await seedDemoData(userId);

        return NextResponse.json({ success: true, message: 'Demo data re-seeded successfully.' });
    } catch (error) {
        console.error('Error re-seeding demo data:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to seed demo database' },
            { status: 500 }
        );
    }
}
