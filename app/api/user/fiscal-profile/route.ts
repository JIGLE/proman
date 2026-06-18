/**
 * API Route: /api/user/fiscal-profile
 * GET  — Return current user's fiscal profile fields
 * POST — Save fiscal profile (fiscalResidency, nhrStatus, nhrYear, ificiStatus, ificiYear)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { logAudit } from "@/lib/services/audit-log";

export const runtime = "nodejs";

const fiscalProfileSchema = z
  .object({
    fiscalResidency: z.string().max(10).nullable().optional(),
    nhrStatus: z.boolean().optional(),
    nhrYear: z.number().int().min(2009).max(2024).nullable().optional(),
    ificiStatus: z.boolean().optional(),
    ificiYear: z.number().int().min(2024).max(2030).nullable().optional(),
  })
  .refine(
    (data) => {
      // NHR and IFICI are mutually exclusive
      if (data.nhrStatus && data.ificiStatus) return false;
      return true;
    },
    { message: "NHR and IFICI are mutually exclusive — only one can be active at a time" },
  );

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fiscalResidency: true,
        nhrStatus: true,
        nhrYear: true,
        ificiStatus: true,
        ificiYear: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Failed to fetch fiscal profile:", error);
    return NextResponse.json({ error: "Failed to fetch fiscal profile" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;
    const rawBody: unknown = await request.json();
    const parsed = fiscalProfileSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { fiscalResidency, nhrStatus, nhrYear, ificiStatus, ificiYear } = parsed.data;

    const prisma = getPrismaClient();
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fiscalResidency !== undefined && { fiscalResidency }),
        ...(nhrStatus !== undefined && { nhrStatus }),
        ...(nhrYear !== undefined && { nhrYear }),
        ...(ificiStatus !== undefined && { ificiStatus }),
        ...(ificiYear !== undefined && { ificiYear }),
      },
      select: {
        fiscalResidency: true,
        nhrStatus: true,
        nhrYear: true,
        ificiStatus: true,
        ificiYear: true,
      },
    });

    await logAudit({
      userId,
      action: "UPDATE_FISCAL_PROFILE",
      resourceType: "User",
      resourceId: userId,
      details: { fiscalResidency, nhrStatus, nhrYear, ificiStatus, ificiYear },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Failed to save fiscal profile:", error);
    return NextResponse.json({ error: "Failed to save fiscal profile" }, { status: 500 });
  }
}
