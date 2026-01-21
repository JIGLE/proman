import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getPrismaClient } from '@/lib/database';
import { getAuthOptions } from "@/lib/auth";
import { maintenanceSchema } from '@/lib/validation';

export async function GET(): Promise<NextResponse> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = await getServerSession(getAuthOptions() as any) as Session | null;
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prisma = getPrismaClient();

        let user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            // Create user if not found (fallback for auth issues)
            user = await prisma.user.create({
                data: {
                    email: session.user.email,
                    name: session.user.name || '',
                },
            });
            console.log('Created missing user:', user.id);
        }

        const tickets = await prisma.maintenanceTicket.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                property: {
                    select: { name: true },
                },
                tenant: {
                    select: { name: true },
                },
            },
        });

        // Transform to flat structure
        const transformedTickets = tickets.map((ticket) => ({
            ...ticket,
            propertyName: ticket.property.name,
            tenantName: ticket.tenant?.name,
        }));

        return NextResponse.json(transformedTickets);
    } catch (error) {
        console.error('Error fetching maintenance tickets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tickets' },
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

        let user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            // Create user if not found (fallback for auth issues)
            user = await prisma.user.create({
                data: {
                    email: session.user.email,
                    name: session.user.name || '',
                },
            });
            console.log('Created missing user:', user.id);
        }

        const json = await req.json();
        const body = maintenanceSchema.parse(json);

        const ticket = await prisma.maintenanceTicket.create({
            data: {
                ...body,
                userId: user.id,
                images: '[]', // Default empty JSON array for now as image upload is complex
            },
            include: {
                property: { select: { name: true } },
                tenant: { select: { name: true } },
            },
        });

        return NextResponse.json({
            ...ticket,
            propertyName: ticket.property.name,
            tenantName: ticket.tenant?.name,
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        return NextResponse.json(
            { error: 'Failed to create ticket' },
            { status: 500 }
        );
    }
}
