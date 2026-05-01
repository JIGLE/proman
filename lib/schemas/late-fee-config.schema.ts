import { z } from "zod";

export const lateFeeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  gracePeriodDays: z.number().min(0).max(30).default(5),
  percentageRate: z.number().min(0).max(50).default(5),
  flatFee: z.number().min(0).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
});

export type LateFeeConfig = z.infer<typeof lateFeeConfigSchema>;
export type LateFeeConfigFormData = z.infer<typeof lateFeeConfigSchema>;
