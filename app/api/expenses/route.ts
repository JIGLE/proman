import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getPrismaClient } from '@/lib/database';
import { getAuthOptions } from "@/lib/auth";
import { expenseSchema } from '@/lib/validation';

export async function GET() {
    try {
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

        const expenses = await prisma.expense.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            include: {
                property: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Transform expenses to include propertyName flat
        const transformedExpenses = expenses.map((expense: any) => ({
            ...expense,
            propertyName: expense.property.name,
        }));

        return NextResponse.json(transformedExpenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expenses' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
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
        const body = expenseSchema.parse(json);

        const expense = await prisma.expense.create({
            data: {
                ...body,
                userId: user.id,
                date: new Date(body.date),
            },
            include: {
                property: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({
            ...expense,
            propertyName: expense.property.name,
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json(
            { error: 'Failed to create expense' },
            { status: 500 }
        );
    }
}
