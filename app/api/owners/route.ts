import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getPrismaClient } from '@/lib/database';
import { getAuthOptions } from "@/lib/auth";
import { ownerSchema } from '@/lib/validation';

export async function GET(): Promise<NextResponse> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = await getServerSession(getAuthOptions() as any) as Session | null;
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prisma = getPrismaClient();

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const owners = await prisma.owner.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                properties: {
                    include: {
                        property: true,
                    },
                },
            },
        });

        return NextResponse.json(owners);
    } catch (error) {
        console.error('Error fetching owners:', error);
        return NextResponse.json(
            { error: 'Failed to fetch owners' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = await getServerSession(getAuthOptions() as any) as Session | null;
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prisma = getPrismaClient();

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const json = await req.json();
        const body = ownerSchema.parse(json);

        const owner = await prisma.owner.create({
            data: {
                ...body,
                userId: user.id,
            },
        });

        return NextResponse.json(owner);
    } catch (error) {
        console.error('Error creating owner:', error);
        return NextResponse.json(
            { error: 'Failed to create owner' },
            { status: 500 }
        );
    }
}
