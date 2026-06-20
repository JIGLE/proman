import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { isMockMode } from "@/lib/config/data-mode";
import { isDemoRequest } from "@/lib/demo/demo-mode";
import { seedDemoData, clearUserData } from "@/lib/demo-seed";

/**
 * User-facing "Load sample portfolio" / "Clear sample data" endpoint.
 *
 * Unlike the env-gated debug seeder, this is available to any authenticated
 * owner, but POST only seeds when the account is empty so it can never wipe a
 * user's real data. Lets a brand-new user populate the dashboard instantly and
 * explore before committing their own data (the "aha moment").
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (isMockMode || isDemoRequest(request)) {
    return NextResponse.json({ error: "Not available in this mode" }, { status: 400 });
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult as NextResponse;
  const { userId } = authResult;

  const prisma = getPrismaClient();

  // Safety guard: never overwrite existing data. Sample data is an empty-state
  // onboarding aid only.
  const existing = await prisma.property.count({ where: { userId } });
  if (existing > 0) {
    return NextResponse.json(
      { error: "Account already has data; sample portfolio is only for empty accounts." },
      { status: 409 },
    );
  }

  try {
    await seedDemoData(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to load sample portfolio:", error);
    return NextResponse.json({ error: "Failed to load sample portfolio" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (isMockMode || isDemoRequest(request)) {
    return NextResponse.json({ error: "Not available in this mode" }, { status: 400 });
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult as NextResponse;
  const { userId } = authResult;

  try {
    await clearUserData(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear sample data:", error);
    return NextResponse.json({ error: "Failed to clear sample data" }, { status: 500 });
  }
}
