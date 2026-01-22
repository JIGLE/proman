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

    // Export user's data as JSON
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        properties: true,
        tenants: true,
        receipts: true,
        expenses: true,
        maintenanceTickets: true,
        leases: true,
        correspondences: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // TODO: Log for GDPR (auditLog not yet available in client)

    return new Response(JSON.stringify(user, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=user-data.json",
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}