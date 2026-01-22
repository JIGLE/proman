import { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { getPrismaClient } from "@/lib/database";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;
    const prisma = getPrismaClient();

    // GDPR: Delete user's data
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    // Log deletion
    // Note: Since user is deleted, we can't log to AuditLog, but we could log elsewhere

    return Response.json({ message: "Data deleted successfully" });
  } catch (error) {
    console.error("Data delete error:", error);
    return Response.json({ error: "Deletion failed" }, { status: 500 });
  }
}