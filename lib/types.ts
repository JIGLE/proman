"use client";

export interface Property {
  id: string;
  name: string;
  address: string;
  type: "apartment" | "house" | "condo" | "townhouse" | "other";
  bedrooms: number;
  bathrooms: number;
  rent: number;
  status: "occupied" | "vacant" | "maintenance";
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId?: string;
  propertyName?: string;
  rent: number;
  leaseStart: string;
  leaseEnd: string;
  paymentStatus: "paid" | "overdue" | "pending";
  lastPayment?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  amount: number;
  date: string;
  type: "rent" | "deposit" | "maintenance" | "other";
  status: "paid" | "pending";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrespondenceTemplate {
  id: string;
  name: string;
  type: "welcome" | "rent_reminder" | "eviction_notice" | "maintenance_request" | "lease_renewal" | "custom";
  subject: string;
  content: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Correspondence {
  id: string;
  templateId: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  content: string;
  status: "draft" | "sent" | "delivered";
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Initial empty data
export const initialProperties: Property[] = [];
export const initialTenants: Tenant[] = [];
export const initialReceipts: Receipt[] = [];
export const initialTemplates: CorrespondenceTemplate[] = [
  {
    id: "welcome-template",
    name: "Welcome Letter",
    type: "welcome",
    subject: "Welcome to {{property_name}}",
    content: `Dear {{tenant_name}},

Welcome to {{property_name}}! We're excited to have you as our tenant.

Your lease begins on {{lease_start}} and runs through {{lease_end}}.

Property Details:
- Address: {{property_address}}
- Monthly Rent: $\{{rent_amount}}
- Bedrooms: {{bedrooms}}
- Bathrooms: {{bathrooms}}

Please don't hesitate to contact us if you need anything.

Best regards,
Property Management Team`,
    variables: ["tenant_name", "property_name", "lease_start", "lease_end", "property_address", "rent_amount", "bedrooms", "bathrooms"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rent-reminder-template",
    name: "Rent Payment Reminder",
    type: "rent_reminder",
    subject: "Rent Payment Due - {{property_name}}",
    content: `Dear {{tenant_name}},

This is a friendly reminder that your rent payment of $\{{rent_amount}} for {{property_name}} is due on {{due_date}}.

Please ensure payment is made by the due date to avoid any late fees.

Payment can be made via:
- Bank transfer to: [Account details]
- Online portal: [Portal link]
- Check mailed to: [Mailing address]

If you have already made this payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
Property Management Team`,
    variables: ["tenant_name", "property_name", "rent_amount", "due_date"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
export const initialCorrespondence: Correspondence[] = [];