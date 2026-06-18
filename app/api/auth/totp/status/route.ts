import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

// GET /api/auth/totp/status — return whether TOTP is enabled for the current user
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });

    return NextResponse.json({ totpEnabled: user?.totpEnabled ?? false });
  } catch (err) {
    console.error("TOTP status error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
