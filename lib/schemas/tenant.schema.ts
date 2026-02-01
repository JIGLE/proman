import { z } from 'zod';

/**
 * Shared Tenant Schema
 * 
 * Used across the application for:
 * - Frontend validation (tenant forms)
 * - Backend API validation
 * - Database operations
 * 
 * Ensures consistent tenant data validation.
 */

export const tenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  phone: z.string().min(1, 'Phone number is required').max(20, 'Phone number too long'),
  propertyId: z.string().optional(),
  rent: z.number().positive('Rent must be positive'),
  leaseStart: z.coerce.date(),
  leaseEnd: z.coerce.date(),
  paymentStatus: z.enum(['pending', 'paid', 'overdue', 'partial']).default('pending'),
  lastPayment: z.coerce.date().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

export const createTenantSchema = tenantSchema.omit({ 
  paymentStatus: true,
  lastPayment: true 
});

export const updateTenantSchema = tenantSchema.partial();

export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenant = z.infer<typeof createTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;
