import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock functions
const mockCreate = vi.fn().mockResolvedValue({ id: 'test-id' })
const mockFindMany = vi.fn().mockResolvedValue([
  { action: 'LOGIN', details: null, createdAt: new Date() },
  { action: 'VIEW_PERSONAL_DATA', details: '{}', createdAt: new Date() },
])
const mockDeleteMany = vi.fn().mockResolvedValue({ count: 5 })

// Mock the database module before imports
vi.mock('@/lib/database', () => ({
  getPrismaClient: () => ({
    auditLog: {
      create: mockCreate,
      findMany: mockFindMany,
      deleteMany: mockDeleteMany,
    },
  }),
}))

import { logAudit, getAuditLogsForUser, deleteAuditLogsForUser, createAuditMiddleware } from '@/lib/audit-log'

describe('Audit Log Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logAudit', () => {
    it('should create an audit log entry with string details', async () => {
      await logAudit({
        userId: 'user-123',
        action: 'LOGIN',
        details: 'User logged in from IP 192.168.1.1',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'LOGIN',
          details: 'User logged in from IP 192.168.1.1',
        },
      })
    })

    it('should serialize object details to JSON', async () => {
      await logAudit({
        userId: 'user-123',
        action: 'EXPORT_PERSONAL_DATA',
        details: { exportedAt: '2024-01-01', format: 'JSON' },
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'EXPORT_PERSONAL_DATA',
          details: JSON.stringify({ exportedAt: '2024-01-01', format: 'JSON' }),
        },
      })
    })

    it('should handle null details', async () => {
      await logAudit({
        userId: 'user-123',
        action: 'LOGOUT',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'LOGOUT',
          details: null,
        },
      })
    })

    it('should not throw on database error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB Error'))

      // Should not throw
      await expect(logAudit({
        userId: 'user-123',
        action: 'LOGIN',
      })).resolves.toBeUndefined()
    })
  })

  describe('getAuditLogsForUser', () => {
    it('should return audit logs for a user', async () => {
      const logs = await getAuditLogsForUser('user-123')

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: {
          action: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(logs).toHaveLength(2)
    })
  })

  describe('deleteAuditLogsForUser', () => {
    it('should delete audit logs and return count', async () => {
      const count = await deleteAuditLogsForUser('user-123')

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(count).toBe(5)
    })
  })

  describe('createAuditMiddleware', () => {
    it('should create a middleware function that logs audits', async () => {
      const middleware = createAuditMiddleware('CREATE_PROPERTY', 'Property')
      
      await middleware('user-123', 'prop-456', { name: 'Test Property' })

      // The middleware calls logAudit which calls prisma.auditLog.create
      expect(mockCreate).toHaveBeenCalled()
    })
  })
})
