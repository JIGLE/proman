import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { logAudit } from "@/lib/services/audit-log";
import {
  createOwnershipVerification,
  listOwnershipVerifications,
} from "@/lib/services/verification/ownership-verification";
import {
  createOwnershipVerificationSchema,
  ownershipVerificationFiltersSchema,
} from "@/lib/schemas/ownership-verification.schema";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const url = new URL(request.url);
  const filters = ownershipVerificationFiltersSchema.parse({
    provider: url.searchParams.get("provider") ?? undefined,
    scope: url.searchParams.get("scope") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    propertyId: url.searchParams.get("propertyId") ?? undefined,
  });

  const verifications = await listOwnershipVerifications(userId, filters);

  await logAudit({
    userId,
    action: "VIEW_OWNERSHIP_VERIFICATIONS",
    resourceType: "GovernmentVerification",
    details: {
      ...filters,
      resultCount: verifications.length,
    },
  });

  return NextResponse.json({ verifications });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const body = await request.json();
  const parsed = createOwnershipVerificationSchema.safeParse(body);

  if (!parsed.success) {
    await logAudit({
      userId,
      action: "CREATE_OWNERSHIP_VERIFICATION",
      resourceType: "GovernmentVerification",
      details: {
        success: false,
        issues: parsed.error.flatten(),
      },
    });

    return NextResponse.json(
      { error: "Invalid verification payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const verification = await createOwnershipVerification(userId, parsed.data);

  await logAudit({
    userId,
    action: "CREATE_OWNERSHIP_VERIFICATION",
    resourceType: "GovernmentVerification",
    resourceId: verification.id,
    details: {
      success: true,
      provider: verification.provider,
      scope: verification.scope,
      claimCount: verification.propertyClaims.length,
    },
  });

  return NextResponse.json({ verification }, { status: 201 });
}
