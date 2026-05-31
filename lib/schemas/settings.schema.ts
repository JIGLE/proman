import { z } from "zod";

export const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  maintenanceReminders: z.boolean(),
  paymentReminders: z.boolean(),
  theme: z.enum(["dark", "light"]),
  language: z.enum(["en", "es", "fr"]),
  profileVisibility: z.enum(["public", "private"]),
  dataSharing: z.boolean(),
  timezone: z.string(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD"]),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
