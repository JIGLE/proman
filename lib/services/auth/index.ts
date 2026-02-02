/**
 * Authentication Services Module
 * 
 * Exports all authentication-related services and utilities.
 * Usage: import { getAuthOptions, requireAuth, validateTenantPortalToken } from '@/services/auth'
 */

export { getAuthOptions, getServerAuthSession } from './auth'
export { requireAuth, createAuditMiddleware } from './auth-middleware'
export { validateTenantPortalToken, generateTenantPortalToken } from './tenant-portal-auth'
export type * from './auth-types'
