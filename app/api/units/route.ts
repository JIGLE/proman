import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleOptions,
} from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { isMockMode } from "@/lib/config/data-mode";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { userId } = authResult;

    // In mock mode, return empty units array
    if (isMockMode) {
      return NextResponse.json([]);
    }

    const prisma = getPrismaClient();
    const units = await prisma.unit.findMany({
      where: {
        property: {
          userId,
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
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { userId } = authResult;
    const body = await request.json();
    const {
      propertyId,
      number,
      floor,
      sizeSqM,
      bedrooms,
      bathrooms,
      status,
      notes,
    } = body;

    if (!propertyId || !number) {
      return NextResponse.json(
        { error: "Property ID and unit number are required" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 },
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
        status: status || "vacant",
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
    console.error("Error creating unit:", error);

    // Check for unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A unit with this number already exists for this property" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const OPTIONS = handleOptions;
