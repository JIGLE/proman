import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

// DELETE /api/auth/totp/disable — remove TOTP from the account
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("TOTP disable error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
