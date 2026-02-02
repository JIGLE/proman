import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getPrismaClient } from '@/lib/services/database/database';
import { getAuthOptions } from "@/lib/services/auth/auth";
import { maintenanceSchema } from '@/lib/utils/validation';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(
    req: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        const { id } = await params;
        
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

        const ticket = await prisma.maintenanceTicket.findFirst({
            where: { 
                id,
                userId: user.id 
            },
            include: {
                property: { select: { name: true } },
                tenant: { select: { name: true } },
            },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...ticket,
            propertyName: ticket.property.name,
            tenantName: ticket.tenant?.name,
        });
    } catch (error) {
        console.error('Error fetching maintenance ticket:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ticket' },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        const { id } = await params;
        
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

        // Verify ticket belongs to user
        const existingTicket = await prisma.maintenanceTicket.findFirst({
            where: { 
                id,
                userId: user.id 
            },
        });

        if (!existingTicket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const json = await req.json();
        
        // Partial validation - only validate provided fields
        const partialSchema = maintenanceSchema.partial();
        const body = partialSchema.parse(json);

        // Handle status changes - set resolvedAt when status becomes resolved
        const updateData: Record<string, unknown> = { ...body };
        if (body.status === 'resolved' && existingTicket.status !== 'resolved') {
            updateData.resolvedAt = new Date();
        } else if (body.status && body.status !== 'resolved') {
            updateData.resolvedAt = null;
        }

        const ticket = await prisma.maintenanceTicket.update({
            where: { id },
            data: updateData,
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
        console.error('Error updating maintenance ticket:', error);
        return NextResponse.json(
            { error: 'Failed to update ticket' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        const { id } = await params;
        
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

        // Verify ticket belongs to user before deleting
        const existingTicket = await prisma.maintenanceTicket.findFirst({
            where: { 
                id,
                userId: user.id 
            },
        });

        if (!existingTicket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        await prisma.maintenanceTicket.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting maintenance ticket:', error);
        return NextResponse.json(
            { error: 'Failed to delete ticket' },
            { status: 500 }
        );
    }
}
