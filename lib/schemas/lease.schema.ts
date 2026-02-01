import { z } from 'zod';

/**
 * Shared Lease Schema
 * 
 * Used across the application for:
 * - Frontend validation (lease forms)
 * - Backend API validation
 * - Database operations
 */

export const leaseSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.number().positive('Rent must be positive'),
  deposit: z.number().min(0, 'Deposit cannot be negative').default(0),
  status: z.enum(['active', 'expired', 'terminated', 'draft']).default('draft'),
  terms: z.string().max(2000, 'Terms too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  autoRenew: z.boolean().default(false),
  renewalPeriod: z.number().min(1, 'Renewal period must be at least 1 month').default(12),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const createLeaseSchema = leaseSchema.omit({ status: true });
export const updateLeaseSchema = leaseSchema.partial();

export type Lease = z.infer<typeof leaseSchema>;
export type CreateLease = z.infer<typeof createLeaseSchema>;
export type UpdateLease = z.infer<typeof updateLeaseSchema>;
