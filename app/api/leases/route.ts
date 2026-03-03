import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleOptions,
} from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { leaseSchema } from "@/lib/utils/validation";
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

    const leases = await prisma.lease.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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
    console.error("Error fetching leases:", error);
    return NextResponse.json(
      { error: "Failed to fetch leases" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult as NextResponse;

    const { userId } = authResult;
    const prisma = getPrismaClient();

    const json = await request.json();
    const body = leaseSchema.parse(json);

    // Handle contract file upload
    let contractFile: Buffer | undefined;
    let contractFileName: string | undefined;
    let contractFileSize: number | undefined;

    if (json.contractFile) {
      contractFile = Buffer.from(json.contractFile, "base64");
      contractFileSize = contractFile.length;
      // You might want to extract filename from the upload or generate one
      contractFileName = `lease-contract-${Date.now()}.pdf`;
    }

    const lease = await prisma.lease.create({
      data: {
        ...body,
        userId,
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
    console.error("Error creating lease:", error);
    return NextResponse.json(
      { error: "Failed to create lease" },
      { status: 500 },
    );
  }
}
