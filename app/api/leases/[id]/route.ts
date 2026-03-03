import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleOptions,
} from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();
    const { id } = await params;
    const json = await request.json();

    // Handle contract file update
    let updateData: Record<string, unknown> = { ...json };

    if (json.startDate) updateData.startDate = new Date(json.startDate);
    if (json.endDate) updateData.endDate = new Date(json.endDate);

    if (json.contractFile) {
      const contractBuffer = Buffer.from(json.contractFile, "base64");
      updateData.contractFile = contractBuffer;
      updateData.contractFileSize = contractBuffer.length;
      updateData.contractFileName = `lease-contract-${Date.now()}.pdf`;
    }

    const lease = await prisma.lease.update({
      where: {
        id,
        userId,
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
    console.error("Error updating lease:", error);
    return NextResponse.json(
      { error: "Failed to update lease" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();
    const { id } = await params;

    await prisma.lease.delete({
      where: {
        id,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lease:", error);
    return NextResponse.json(
      { error: "Failed to delete lease" },
      { status: 500 },
    );
  }
}
