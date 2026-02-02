/**
 * Database Services Module
 * 
 * Exports all database-related services and utilities.
 * Usage: import { getPrismaClient } from '@/services/database'
 */

export { getPrismaClient } from './database'
export { createSqliteDriverAdapterFactory } from './sqlite-adapter'
