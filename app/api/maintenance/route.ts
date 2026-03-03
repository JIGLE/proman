import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleOptions,
} from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { maintenanceSchema } from "@/lib/utils/validation";
import { isMockMode } from "@/lib/config/data-mode";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // In mock mode, return empty array
    if (isMockMode) {
      return NextResponse.json([]);
    }
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();

    const tickets = await prisma.maintenanceTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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
    console.error("Error fetching maintenance tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // In mock mode, reject write operations
    if (isMockMode) {
      return NextResponse.json(
        { error: "Write operations not supported in mock mode" },
        { status: 403 },
      );
    }
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();

    const json = await request.json();
    const body = maintenanceSchema.parse(json);

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        ...body,
        userId,
        images: "[]", // Default empty JSON array for now as image upload is complex
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
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }
}
