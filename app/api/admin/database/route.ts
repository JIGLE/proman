import { NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/services/database/database";
import { requireAdmin } from "@/lib/services/auth/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) return authResult;
    const prisma = getPrismaClient();

    // TODO: Log access for GDPR compliance (auditLog not yet available in client)

    // Get all table names from Prisma schema (simplified introspection)
    const tables = [
      "User", "Property", "Tenant", "Receipt", "Expense", "MaintenanceTicket",
      "Lease", "Correspondence", "CorrespondenceTemplate", "Owner", "PropertyOwner",
      "EmailLog", "Account", "Session", "VerificationToken"
    ];

    const data: Record<string, unknown[]> = {};

    // Query each table with pagination (limit 50 for GDPR minimization)
    for (const table of tables) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaAny = prisma as any;
        const tableKey = table.toLowerCase();
        if (typeof prismaAny[tableKey]?.findMany === 'function') {
          const records = await prismaAny[tableKey].findMany({
            take: 50,
            orderBy: { createdAt: "desc" },
          });
          // Anonymize sensitive fields for GDPR
          data[table] = records.map((record: unknown) => {
            const anonymized = { ...(record as Record<string, unknown>) };
            if (typeof anonymized.email === 'string') anonymized.email = anonymized.email.replace(/(.{2}).*(@.*)/, "$1***$2");
            if (typeof anonymized.name === 'string' && table !== "User") anonymized.name = anonymized.name.replace(/(.).*/, "$1***");
            return anonymized;
          });
        } else {
          data[table] = [{ error: "Table not found" }];
        }
      } catch {
        data[table] = [{ error: "Failed to load table" }];
      }
    }

    return Response.json({ tables, data });
  } catch (error) {
    console.error("Database view error:", error);
    return Response.json({ error: "Access denied or server error" }, { status: 500 });
  }
}
