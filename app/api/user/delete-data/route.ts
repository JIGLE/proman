import { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { getPrismaClient } from "@/lib/database";
import { requireAuth } from "@/lib/auth-middleware";
import { logAudit } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;
    const prisma = getPrismaClient();

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Log deletion BEFORE deleting (so we have the userId reference)
    await logAudit({
      userId,
      action: 'DELETE_PERSONAL_DATA',
      details: { 
        requestedAt: new Date().toISOString(),
        email: userEmail,
      },
    });

    // GDPR: Delete user's data (cascade will delete audit logs too)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Note: Audit log for this user is deleted due to cascade
    // For compliance, you may want to keep anonymized deletion records separately
    console.info(`[GDPR] User data deleted: ${userEmail} at ${new Date().toISOString()}`);

    return Response.json({ message: "Data deleted successfully" });
  } catch (error) {
    console.error("Data delete error:", error);
    return Response.json({ error: "Deletion failed" }, { status: 500 });
  }
}