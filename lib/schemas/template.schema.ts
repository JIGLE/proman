import { z } from "zod";

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100, "Name too long"),
  type: z.enum([
    "welcome",
    "rent_reminder",
    "eviction_notice",
    "maintenance_request",
    "lease_renewal",
    "custom",
  ]),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  content: z.string().min(1, "Content is required").max(5000, "Content too long"),
});

export const createTemplateSchema = templateSchema;
export const updateTemplateSchema = templateSchema.partial();

export type Template = z.infer<typeof templateSchema>;
export type TemplateFormData = z.infer<typeof templateSchema>;
export type CreateTemplate = z.infer<typeof createTemplateSchema>;
export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;
