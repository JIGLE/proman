/**
 * Instance metrics — how the deployment is doing, as distinct from how the portfolio is doing.
 *
 * The separation is the requirement, not decoration. A portfolio number and an instance number
 * sharing a row invites reading one as the other, and "revenue" next to "accounts" is exactly the
 * pair that goes wrong.
 *
 * REUSES rather than recomputes: `getCoreLoopMetrics` already owns the cross-user activation
 * funnel, and `getSignInStatus` already counts accounts. A second count of the same thing is a
 * second thing to disagree.
 *
 * DELIBERATELY NOT HERE: schema drift and provider health. Those are Status. A number appearing in
 * two sections is a number that will eventually contradict itself.
 *
 * Every probe degrades on its own. This page is opened when something is wrong, so one failing
 * measurement must not blank the other five — same rule as `getSystemStatus`.
 */

import { statSync } from "node:fs";

import { getPrismaClient } from "@/lib/services/database/database";
import { getCoreLoopMetrics } from "@/lib/services/analytics/activation-summary";

export interface InstanceMetrics {
  accounts: { total: number; admins: number };
  /** Bytes, or null when the path cannot be read — never a zero standing in for "unknown". */
  databaseBytes: number | null;
  documents: { count: number; bytes: number | null };
  auditLogEntries: number;
  activation: Awaited<ReturnType<typeof getCoreLoopMetrics>> | null;
}

/**
 * The SQLite file behind `DATABASE_URL`, if it is a file URL at all.
 *
 * Returns null rather than throwing or guessing. A managed database has no local file, and
 * reporting 0 bytes for one would be a measurement that reads as a fact.
 */
export function databaseFileSize(url = process.env.DATABASE_URL): number | null {
  if (!url?.startsWith("file:")) return null;
  try {
    return statSync(url.slice("file:".length)).size;
  } catch {
    return null;
  }
}

export async function getInstanceMetrics(): Promise<InstanceMetrics> {
  const prisma = getPrismaClient();

  // allSettled, not all: a failing probe reports as unknown rather than removing every other
  // number from the page.
  const [accountsTotal, accountsAdmins, documentCount, documentBytes, auditCount, activation] =
    await Promise.allSettled([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.document.count(),
      prisma.document.aggregate({ _sum: { fileSize: true } }),
      prisma.auditLog.count(),
      getCoreLoopMetrics(prisma),
    ]);

  const value = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
    result.status === "fulfilled" ? result.value : fallback;

  return {
    accounts: {
      total: value(accountsTotal, 0),
      admins: value(accountsAdmins, 0),
    },
    databaseBytes: databaseFileSize(),
    documents: {
      count: value(documentCount, 0),
      bytes:
        documentBytes.status === "fulfilled"
          ? (documentBytes.value._sum.fileSize ?? 0)
          : // Unknown, not zero. An empty store and an unreadable one are different facts.
            null,
    },
    auditLogEntries: value(auditCount, 0),
    activation: activation.status === "fulfilled" ? activation.value : null,
  };
}
