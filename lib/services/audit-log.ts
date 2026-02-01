import { getPrismaClient } from '@/lib/services/database/database'

/**
 * GDPR-compliant audit logging service
 * 
 * Logs user actions for compliance with GDPR Article 30 (Records of processing activities)
 * and Article 5(2) (Accountability principle)
 */

export type AuditAction = 
  // Authentication
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  // Data access
  | 'VIEW_PERSONAL_DATA'
  | 'EXPORT_PERSONAL_DATA'
  | 'DELETE_PERSONAL_DATA'
  // CRUD operations
  | 'CREATE_PROPERTY'
  | 'UPDATE_PROPERTY'
  | 'DELETE_PROPERTY'
  | 'CREATE_TENANT'
  | 'UPDATE_TENANT'
  | 'DELETE_TENANT'
  | 'CREATE_LEASE'
  | 'UPDATE_LEASE'
  | 'DELETE_LEASE'
  | 'CREATE_UNIT'
  | 'UPDATE_UNIT'
  | 'DELETE_UNIT'
  | 'CREATE_RECEIPT'
  | 'UPDATE_RECEIPT'
  | 'DELETE_RECEIPT'
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'CREATE_MAINTENANCE'
  | 'UPDATE_MAINTENANCE'
  | 'DELETE_MAINTENANCE'
  | 'CREATE_CORRESPONDENCE'
  | 'UPDATE_CORRESPONDENCE'
  | 'DELETE_CORRESPONDENCE'
  | 'SEND_EMAIL'
  // Admin actions
  | 'DATABASE_ACCESS'
  | 'DATABASE_EXPORT'
  | 'SETTINGS_CHANGE'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  details?: string | Record<string, unknown>
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit entry for GDPR compliance
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const prisma = getPrismaClient()
    
    // Serialize details if it's an object
    const details = typeof entry.details === 'object' 
      ? JSON.stringify(entry.details) 
      : entry.details

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        details: details || null,
      },
    })

    // Optional: Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Audit] ${entry.action} by user ${entry.userId}`, entry.details || '')
    }
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error('[Audit] Failed to log entry:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Get audit logs for a user (for GDPR data export)
 */
export async function getAuditLogsForUser(userId: string): Promise<{
  action: string
  details: string | null
  createdAt: Date
}[]> {
  const prisma = getPrismaClient()
  
  return prisma.auditLog.findMany({
    where: { userId },
    select: {
      action: true,
      details: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Delete audit logs for a user (for GDPR right to erasure)
 * Note: Some audit logs may need to be retained for legal compliance
 */
export async function deleteAuditLogsForUser(userId: string): Promise<number> {
  const prisma = getPrismaClient()
  
  const result = await prisma.auditLog.deleteMany({
    where: { userId },
  })
  
  return result.count
}

/**
 * Helper to create audit middleware for API routes
 */
export function createAuditMiddleware(action: AuditAction, resourceType?: string) {
  return async (userId: string, resourceId?: string, details?: Record<string, unknown>) => {
    await logAudit({
      userId,
      action,
      resourceType,
      resourceId,
      details,
    })
  }
}
