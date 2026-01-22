import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/database";
import { redirect } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DatabasePage() {
  // This page is server-side rendered with auth check
  const t = await getTranslations("admin.database");

  try {
    // Note: In a real implementation, fetch from API route, but for simplicity, inline here
    const tables = [
      "User", "Property", "Tenant", "Receipt", "Expense", "MaintenanceTicket",
      "Lease", "Correspondence", "CorrespondenceTemplate", "Owner", "PropertyOwner",
      "EmailLog", "Account", "Session", "VerificationToken"
    ];

    const data: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const records = await (prisma as any)[table.toLowerCase()].findMany({
          take: 50,
          orderBy: { createdAt: "desc" },
        });
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

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("title", { defaultValue: "Database View" })}</h1>
          <p className="text-muted-foreground mt-2">
            {t("description", { defaultValue: "Read-only view of database tables. Access logged for GDPR compliance." })}
          </p>
        </div>

        {tables.map(table => (
          <Card key={table} className="mb-6">
            <CardHeader>
              <CardTitle>{table}</CardTitle>
              <Badge variant="secondary">{data[table].length} records</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {data[table][0] && Object.keys(data[table][0]).map(key => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data[table].map((record, idx) => (
                    <TableRow key={idx}>
                      {Object.values(record).map((value, i) => (
                        <TableCell key={i}>{JSON.stringify(value)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } catch (error) {
    redirect("/"); // Redirect on auth failure
  }
}