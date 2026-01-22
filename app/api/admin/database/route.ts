import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/database";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);

    // Log access for GDPR compliance
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DATABASE_VIEW_ACCESS",
        details: JSON.stringify({ ip: request.ip || "unknown", userAgent: request.headers.get("user-agent") }),
      },
    });

    // Get all table names from Prisma schema (simplified introspection)
    const tables = [
      "User", "Property", "Tenant", "Receipt", "Expense", "MaintenanceTicket",
      "Lease", "Correspondence", "CorrespondenceTemplate", "Owner", "PropertyOwner",
      "EmailLog", "Account", "Session", "VerificationToken"
    ];

    const data: Record<string, any[]> = {};

    // Query each table with pagination (limit 50 for GDPR minimization)
    for (const table of tables) {
      try {
        const records = await (prisma as any)[table.toLowerCase()].findMany({
          take: 50,
          orderBy: { createdAt: "desc" },
        });
        // Anonymize sensitive fields for GDPR
        data[table] = records.map(record => {
          const anonymized = { ...record };
          if (anonymized.email) anonymized.email = anonymized.email.replace(/(.{2}).*(@.*)/, "$1***$2");
          if (anonymized.name && table !== "User") anonymized.name = anonymized.name.replace(/(.).*/, "$1***");
          return anonymized;
        });
      } catch (error) {
        data[table] = [{ error: "Failed to load table" }];
      }
    }

    return Response.json({ tables, data });
  } catch (error) {
    console.error("Database view error:", error);
    return Response.json({ error: "Access denied or server error" }, { status: 500 });
  }
}