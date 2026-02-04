/**
 * Database Services Module
 * 
 * Exports all database-related services and utilities.
 * Selects mock or real implementations based on data mode.
 */

import { isMockMode } from '@/lib/config/data-mode';

export { getPrismaClient } from './database';
export { createSqliteDriverAdapterFactory } from './sqlite-adapter';

// Export services based on data mode - use dynamic imports to avoid top-level await
const services = isMockMode 
  ? import('./database.mock')
  : import('./database');

export const propertyService = (await services).propertyService;
export const tenantService = (await services).tenantService;
export const receiptService = (await services).receiptService;
export const templateService = (await services).templateService;
export const correspondenceService = (await services).correspondenceService;
