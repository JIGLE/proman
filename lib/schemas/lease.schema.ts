import { z } from "zod";

const dateOrderRefinement = (data: { startDate?: string; endDate?: string }) => {
  if (!data.startDate || !data.endDate) return true;
  return Date.parse(data.endDate) > Date.parse(data.startDate);
};
const dateOrderError = { message: "End date must be after start date", path: ["endDate"] };

const leaseBaseSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  monthlyRent: z.number().positive("Rent must be positive"),
  deposit: z.number().min(0, "Deposit cannot be negative").default(0),
  taxRegime: z.enum(["portugal_rendamentos", "spain_inmuebles"]).optional(),
  status: z.enum(["active", "expired", "terminated", "pending", "draft"]).default("draft"),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.number().min(0).max(365).default(60),
  notes: z.string().max(1000, "Notes too long").optional(),
});

export const leaseSchema = leaseBaseSchema.refine(dateOrderRefinement, dateOrderError);
export const createLeaseSchema = leaseBaseSchema
  .omit({ status: true })
  .refine(dateOrderRefinement, dateOrderError);
export const updateLeaseSchema = leaseBaseSchema
  .partial()
  .refine(dateOrderRefinement, dateOrderError);

export type Lease = z.infer<typeof leaseSchema>;
export type LeaseFormData = z.infer<typeof leaseSchema>;
export type CreateLease = z.infer<typeof createLeaseSchema>;
export type UpdateLease = z.infer<typeof updateLeaseSchema>;
