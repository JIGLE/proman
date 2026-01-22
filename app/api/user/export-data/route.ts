import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/database";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

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

    // Log for GDPR
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DATA_EXPORT",
        details: JSON.stringify({ exportedAt: new Date().toISOString() }),
      },
    });

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