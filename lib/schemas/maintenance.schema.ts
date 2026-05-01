import { z } from "zod";

export const maintenanceSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  tenantId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(1, "Description is required").max(1000, "Description too long"),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  cost: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
});

export const createMaintenanceSchema = maintenanceSchema;
export const updateMaintenanceSchema = maintenanceSchema.partial();

export type Maintenance = z.infer<typeof maintenanceSchema>;
export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;
export type CreateMaintenance = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenance = z.infer<typeof updateMaintenanceSchema>;
