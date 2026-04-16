import { NextRequest } from "next/server";
import { requireAuth, handleOptions } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { isMockMode } from "@/lib/config/data-mode";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  if (isMockMode) {
    return createSuccessResponse([]);
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

  return createSuccessResponse(units);
}

async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const body = await request.json();
  const { propertyId, number, floor, sizeSqM, bedrooms, bathrooms, status, notes } = body;

  if (!propertyId || !number) {
    return createErrorResponse(new Error("Property ID and unit number are required"), 400, request);
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
    return createErrorResponse(new Error("Property not found or access denied"), 404, request);
  }

  try {
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

    return createSuccessResponse(unit, 201);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse(
        new Error("A unit with this number already exists for this property"),
        409,
        request,
      );
    }
    throw error;
  }
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;
