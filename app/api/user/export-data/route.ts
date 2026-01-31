import { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { getPrismaClient } from "@/lib/database";
import { requireAuth } from "@/lib/auth-middleware";
import { logAudit, getAuditLogsForUser } from "@/lib/audit-log";

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

    // Get audit logs for GDPR export
    const auditLogs = await getAuditLogsForUser(session.user.id);

    // Log this export action for GDPR compliance
    await logAudit({
      userId: session.user.id,
      action: 'EXPORT_PERSONAL_DATA',
      details: { exportedAt: new Date().toISOString() },
    });

    // Include audit logs in the export
    const exportData = {
      ...user,
      auditLogs,
      exportedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
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