import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { encryptPII } from "@/lib/utils/pii-encryption";
import { totpGenerateSecret, totpKeyuri } from "@/lib/utils/totp";

const APP_NAME = "Domora";

// GET /api/auth/totp/setup — generate a new TOTP secret and QR code URI
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate a fresh secret (not enabled until user confirms via /enable)
    const secret = totpGenerateSecret();
    const otpauth = totpKeyuri(user.email ?? userId, APP_NAME, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Persist the pending secret encrypted; totpEnabled stays false until confirmed
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encryptPII(secret), totpEnabled: false },
    });

    return NextResponse.json({ secret, qrDataUrl, otpauth });
  } catch (err) {
    console.error("TOTP setup error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
