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
      "User",
      "Property",
      "Tenant",
      "Receipt",
      "Expense",
      "MaintenanceTicket",
      "Lease",
      "Correspondence",
      "CorrespondenceTemplate",
      "Owner",
      "PropertyOwner",
      "EmailLog",
      "Account",
      "Session",
      "VerificationToken",
    ];

    const data: Record<string, unknown[]> = {};

    const maskEmail = (email: string): string => {
      const at = email.indexOf("@");
      if (at <= 0) return "***";
      const local = email.slice(0, at);
      const domain = email.slice(at + 1);
      const localPrefix = local.slice(0, Math.min(2, local.length));
      return `${localPrefix}***@${domain}`;
    };

    const maskName = (name: string): string => {
      if (!name) return "***";
      return `${name.slice(0, 1)}***`;
    };

    // Query each table with pagination (limit 50 for GDPR minimization)
    for (const table of tables) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaAny = prisma as any;
        const tableKey = table.toLowerCase();
        if (typeof prismaAny[tableKey]?.findMany === "function") {
          const records = await prismaAny[tableKey].findMany({
            take: 50,
            orderBy: { createdAt: "desc" },
          });
          // Anonymize sensitive fields for GDPR
          data[table] = records.map((record: unknown) => {
            const anonymized = { ...(record as Record<string, unknown>) };
            if (typeof anonymized.email === "string") {
              anonymized.email = maskEmail(anonymized.email);
            }
            if (typeof anonymized.name === "string" && table !== "User") {
              anonymized.name = maskName(anonymized.name);
            }
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
    return Response.json(
      { error: "Access denied or server error" },
      { status: 500 },
    );
  }
}
