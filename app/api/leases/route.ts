import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getPrismaClient } from '@/lib/database';
import { getAuthOptions } from "@/lib/auth";
import { leaseSchema } from '@/lib/validation';

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

        const leases = await prisma.lease.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
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

        return NextResponse.json(leases);
    } catch (error) {
        console.error('Error fetching leases:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leases' },
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
        const body = leaseSchema.parse(json);

        // Handle contract file upload
        let contractFile: Buffer | undefined;
        let contractFileName: string | undefined;
        let contractFileSize: number | undefined;

        if (json.contractFile) {
            contractFile = Buffer.from(json.contractFile, 'base64');
            contractFileSize = contractFile.length;
            // You might want to extract filename from the upload or generate one
            contractFileName = `lease-contract-${Date.now()}.pdf`;
        }

        const lease = await prisma.lease.create({
            data: {
                ...body,
                userId: user.id,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                contractFile: contractFile ? Buffer.from(contractFile) : undefined,
                contractFileName,
                contractFileSize,
            },
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
        console.error('Error creating lease:', error);
        return NextResponse.json(
            { error: 'Failed to create lease' },
            { status: 500 }
        );
    }
}