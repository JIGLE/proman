/**
 * GDPR data retention service.
 *
 * Retention policy (Article 5(1)(e) GDPR — storage limitation):
 *   - Audit logs:  7 years  (tax / legal obligation, Art. 17(3)(b))
 *   - Email logs:  2 years  (operational need)
 *   - Notifications: 1 year (no ongoing value after archival)
 *
 * Run daily via /api/cron/data-retention.
 */

import { getPrismaClient } from "@/lib/services/database/database";

export interface RetentionResult {
  auditLogsDeleted: number;
  emailLogsDeleted: number;
  notificationsDeleted: number;
  ranAt: string;
}

const RETENTION_DAYS = {
  auditLogs: 7 * 365,
  emailLogs: 2 * 365,
  notifications: 365,
} as const;

function cutoff(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export async function runDataRetention(): Promise<RetentionResult> {
  const prisma = getPrismaClient();

  const [auditResult, emailResult, notifResult] = await Promise.all([
    prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.auditLogs) } },
    }),
    prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.emailLogs) } },
    }),
    prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff(RETENTION_DAYS.notifications) },
        read: true,
      },
    }),
  ]);

  return {
    auditLogsDeleted: auditResult.count,
    emailLogsDeleted: emailResult.count,
    notificationsDeleted: notifResult.count,
    ranAt: new Date().toISOString(),
  };
}

export { RETENTION_DAYS };
