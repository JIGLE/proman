import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getPrismaClient } from '@/lib/services/database/database';
import { getAuthOptions } from "@/lib/services/auth/auth";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

        const { id } = await params;
        const json = await req.json();

        // Handle contract file update
        let updateData: Record<string, unknown> = { ...json };

        if (json.startDate) updateData.startDate = new Date(json.startDate);
        if (json.endDate) updateData.endDate = new Date(json.endDate);

        if (json.contractFile) {
            const contractBuffer = Buffer.from(json.contractFile, 'base64');
            updateData.contractFile = contractBuffer;
            updateData.contractFileSize = contractBuffer.length;
            updateData.contractFileName = `lease-contract-${Date.now()}.pdf`;
        }

        const lease = await prisma.lease.update({
            where: {
                id,
                userId: user.id,
            },
            data: updateData,
            include: {
                property: {
                    select: {
                        name: true,
                        address: true,
                    },
                },
                tenant: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(lease);
    } catch (error) {
        console.error('Error updating lease:', error);
        return NextResponse.json(
            { error: 'Failed to update lease' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

        const { id } = await params;

        await prisma.lease.delete({
            where: {
                id,
                userId: user.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lease:', error);
        return NextResponse.json(
            { error: 'Failed to delete lease' },
            { status: 500 }
        );
    }
}