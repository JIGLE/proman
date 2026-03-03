import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleOptions,
} from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { ownerSchema } from "@/lib/utils/validation";
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

    const owners = await prisma.owner.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        properties: {
          include: {
            property: true,
          },
        },
      },
    });

    return NextResponse.json(owners);
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json(
      { error: "Failed to fetch owners" },
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
    const body = ownerSchema.parse(json);

    const owner = await prisma.owner.create({
      data: {
        ...body,
        userId,
      },
    });

    return NextResponse.json(owner);
  } catch (error) {
    console.error("Error creating owner:", error);
    return NextResponse.json(
      { error: "Failed to create owner" },
      { status: 500 },
    );
  }
}
