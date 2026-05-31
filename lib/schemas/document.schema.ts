import { z } from "zod";

const documentTypeEnum = z.enum([
  "contract",
  "invoice",
  "receipt",
  "photo",
  "floor_plan",
  "certificate",
  "other",
]);

export const documentSchema = z.object({
  name: z.string().min(1, "Document name is required").max(255, "Name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  type: documentTypeEnum,
  mimeType: z.string().min(1, "MIME type is required"),
  fileContent: z.string().min(1, "File content is required"),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  ownerId: z.string().optional(),
  tenantId: z.string().optional(),
});

export const documentUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  type: documentTypeEnum.optional(),
  propertyId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  tenantId: z.string().optional().nullable(),
});

export type Document = z.infer<typeof documentSchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;
export type DocumentUpdateFormData = z.infer<typeof documentUpdateSchema>;
