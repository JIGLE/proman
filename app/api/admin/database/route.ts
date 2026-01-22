import { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { getPrismaClient } from "@/lib/database";
import { requireAdmin } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;
    const prisma = getPrismaClient();

    // TODO: Log access for GDPR compliance (auditLog not yet available in client)

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
        data[table] = records.map((record: any) => {
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