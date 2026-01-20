import { z } from 'zod';

// Property validation schema
export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name too long'),
  address: z.string().min(1, 'Address is required').max(200, 'Address too long'),
  type: z.enum(['apartment', 'house', 'condo', 'townhouse', 'other']),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  rent: z.number().min(0, 'Rent must be positive'),
  status: z.enum(['occupied', 'vacant', 'maintenance']),
  description: z.string().max(500, 'Description too long').optional(),
});

// Tenant validation schema
export const tenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number too short').max(20, 'Phone number too long'),
  propertyId: z.string().optional(),
  rent: z.number().min(0, 'Rent must be positive'),
  leaseStart: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  leaseEnd: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  paymentStatus: z.enum(['paid', 'overdue', 'pending']),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Receipt validation schema
export const receiptSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  propertyId: z.string().min(1, 'Property is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  type: z.enum(['rent', 'deposit', 'maintenance', 'other']),
  status: z.enum(['paid', 'pending']),
  description: z.string().max(200, 'Description too long').optional(),
});

// Correspondence template validation schema
export const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
  type: z.enum(['welcome', 'rent_reminder', 'eviction_notice', 'maintenance_request', 'lease_renewal', 'custom']),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
});

// User settings validation schema
export const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  maintenanceReminders: z.boolean(),
  paymentReminders: z.boolean(),
  theme: z.enum(['dark', 'light']),
  language: z.enum(['en', 'es', 'fr']),
  profileVisibility: z.enum(['public', 'private']),
  dataSharing: z.boolean(),
  timezone: z.string(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD']),
});

// Type exports for form data
export type PropertyFormData = z.infer<typeof propertySchema>;
export type TenantFormData = z.infer<typeof tenantSchema>;
export type ReceiptFormData = z.infer<typeof receiptSchema>;
export type TemplateFormData = z.infer<typeof templateSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;

// Owner validation schema
export const ownerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Expense validation schema
export const expenseSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(200, 'Description too long').optional(),
});

// Maintenance validation schema
export const maintenanceSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  cost: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
});

export type OwnerFormData = z.infer<typeof ownerSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;