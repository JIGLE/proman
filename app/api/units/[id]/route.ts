import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getPrismaClient } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions() as any) as Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const prisma = getPrismaClient();

    const unit = await prisma.unit.findFirst({
      where: {
        id,
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
            tenant: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error('Error fetching unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions() as any) as Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { number, floor, sizeSqM, bedrooms, bathrooms, status, notes } = body;

    const prisma = getPrismaClient();

    // Verify unit ownership
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id,
        property: {
          userId: session.user.id,
        },
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Unit not found or access denied' },
        { status: 404 }
      );
    }

    // Update unit
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        number,
        floor: floor ? parseInt(floor) : null,
        sizeSqM: sizeSqM ? parseFloat(sizeSqM) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        status,
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

    return NextResponse.json(unit);
  } catch (error: any) {
    console.error('Error updating unit:', error);

    if (error.code === 'P2002') {
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions() as any) as Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const prisma = getPrismaClient();

    // Verify unit ownership
    const unit = await prisma.unit.findFirst({
      where: {
        id,
        property: {
          userId: session.user.id,
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found or access denied' },
        { status: 404 }
      );
    }

    // Delete unit
    await prisma.unit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
