import { z } from 'zod';

/**
 * Shared Maintenance Schema
 * 
 * Used across the application for:
 * - Frontend validation (maintenance forms)
 * - Backend API validation
 * - Database operations
 */

export const maintenanceSchema = z.object({
  tenantId: z.string().optional(),
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).default('open'),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'cleaning', 'repairs', 'inspection', 'other']),
  reportedDate: z.coerce.date(),
  scheduledDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  assignedTo: z.string().max(100, 'Assignee name too long').optional(),
  estimatedCost: z.number().min(0, 'Cost cannot be negative').optional(),
  actualCost: z.number().min(0, 'Cost cannot be negative').optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
  recurring: z.boolean().default(false),
  recurringInterval: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
}).refine((data) => {
  if (data.completedDate && data.reportedDate && data.completedDate < data.reportedDate) {
    return false;
  }
  return true;
}, {
  message: 'Completed date cannot be before reported date',
  path: ['completedDate'],
});

export const createMaintenanceSchema = maintenanceSchema.omit({ 
  status: true,
  completedDate: true,
  actualCost: true
});
export const updateMaintenanceSchema = maintenanceSchema.partial();

export type Maintenance = z.infer<typeof maintenanceSchema>;
export type CreateMaintenance = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenance = z.infer<typeof updateMaintenanceSchema>;
