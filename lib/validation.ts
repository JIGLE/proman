import { z } from 'zod';

// Property validation schema
export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name too long'),
  address: z.string().min(1, 'Address is required').max(200, 'Address too long'),
  // Enhanced address fields
  streetAddress: z.string().max(200, 'Street address too long').optional(),
  city: z.string().max(100, 'City name too long').optional(),
  zipCode: z.string().regex(/^(?:[0-9]{4}-[0-9]{3}|[0-9]{5})$/, 'Invalid postal code format').optional(),
  country: z.enum(['Portugal', 'Spain']).default('Portugal'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  addressVerified: z.boolean().default(false),
  // Building grouping
  buildingId: z.string().optional(),
  buildingName: z.string().max(100, 'Building name too long').optional(),
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

// Lease validation schema
export const leaseSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  monthlyRent: z.number().min(0, 'Monthly rent must be positive'),
  deposit: z.number().min(0, 'Deposit cannot be negative').default(0),
  taxRegime: z.enum(['portugal_rendimentos', 'spain_inmuebles']).optional(),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.number().min(0).max(365).default(60),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Invoice validation schema
export const invoiceSchema = z.object({
  tenantId: z.string().optional(),
  propertyId: z.string().optional(),
  ownerId: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid due date'),
  description: z.string().max(500, 'Description too long').optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Line item description required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price cannot be negative'),
    total: z.number().min(0, 'Total cannot be negative'),
  })).optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Late fee configuration schema
export const lateFeeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  gracePeriodDays: z.number().min(0).max(30).default(5),
  percentageRate: z.number().min(0).max(50).default(5),
  flatFee: z.number().min(0).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
});

export type OwnerFormData = z.infer<typeof ownerSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;
export type LeaseFormData = z.infer<typeof leaseSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type LateFeeConfigFormData = z.infer<typeof lateFeeConfigSchema>;