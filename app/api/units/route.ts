import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getAuthOptions } from '@/lib/services/auth/auth';
import { getPrismaClient } from '@/lib/services/database/database';
import { isMockMode } from '@/lib/config/data-mode';

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(getAuthOptions() as any) as Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In mock mode, return empty units array
    if (isMockMode) {
      return NextResponse.json([]);
    }

    const prisma = getPrismaClient();
    const units = await prisma.unit.findMany({
      where: {
        property: {
          userId: session.user.id,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        leases: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(getAuthOptions() as any) as Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId, number, floor, sizeSqM, bedrooms, bathrooms, status, notes } = body;

    if (!propertyId || !number) {
      return NextResponse.json(
        { error: 'Property ID and unit number are required' },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId: session.user.id,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      );
    }

    // Create unit
    const unit = await prisma.unit.create({
      data: {
        propertyId,
        number,
        floor: floor ? parseInt(floor) : null,
        sizeSqM: sizeSqM ? parseFloat(sizeSqM) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        status: status || 'vacant',
        notes,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating unit:', error);
    
    // Check for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A unit with this number already exists for this property' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
