import { getPrismaClient } from './database/database';

// Invoice number format: INV-{YEAR}-{SEQUENCE}
// Example: INV-2026-00001

export interface Invoice {
  id: string;
  userId: string;
  number: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  metadata?: InvoiceMetadata;
  propertyId?: string;
  propertyName?: string;
  ownerId?: string;
  ownerName?: string;
  tenantId?: string;
  tenantName?: string;
  lateFee?: number;
  originalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceMetadata {
  lineItems?: InvoiceLineItem[];
  lateFeeApplied?: boolean;
  lateFeePercentage?: number;
  lateFeeAmount?: number;
  daysOverdue?: number;
  notes?: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateInvoiceData {
  tenantId?: string;
  propertyId?: string;
  ownerId?: string;
  amount: number;
  dueDate: string;
  description?: string;
  lineItems?: InvoiceLineItem[];
  notes?: string;
}

export interface BatchInvoiceResult {
  success: Invoice[];
  failed: { tenantId: string; error: string }[];
}

export interface LateFeeConfig {
  enabled: boolean;
  gracePeriodDays: number;
  percentageRate: number;  // e.g., 5 for 5%
  flatFee?: number;        // Optional flat fee in addition to percentage
  maxPercentage?: number;  // Cap on total late fees
}

const DEFAULT_LATE_FEE_CONFIG: LateFeeConfig = {
  enabled: true,
  gracePeriodDays: 5,
  percentageRate: 5,
  flatFee: 0,
  maxPercentage: 25,
};

/**
 * Generate the next invoice number in sequence
 * Format: INV-{YEAR}-{SEQUENCE} (5-digit padded)
 */
async function generateInvoiceNumber(userId: string): Promise<string> {
  const prisma = getPrismaClient();
  const currentYear = new Date().getFullYear();
  const yearPrefix = `INV-${currentYear}-`;
  
  // Find the highest invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      number: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      number: 'desc',
    },
  });
  
  let nextSequence = 1;
  
  if (lastInvoice) {
    const lastNumber = lastInvoice.number;
    const sequencePart = lastNumber.replace(yearPrefix, '');
    const parsedSequence = parseInt(sequencePart, 10);
    if (!isNaN(parsedSequence)) {
      nextSequence = parsedSequence + 1;
    }
  }
  
  // Pad to 5 digits
  const paddedSequence = nextSequence.toString().padStart(5, '0');
  return `${yearPrefix}${paddedSequence}`;
}

/**
 * Calculate late fee based on configuration
 */
export function calculateLateFee(
  originalAmount: number,
  dueDate: Date,
  config: LateFeeConfig = DEFAULT_LATE_FEE_CONFIG
): { lateFee: number; daysOverdue: number } {
  if (!config.enabled) {
    return { lateFee: 0, daysOverdue: 0 };
  }
  
  const now = new Date();
  const due = new Date(dueDate);
  const timeDiff = now.getTime() - due.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  // Check if within grace period
  if (daysDiff <= config.gracePeriodDays) {
    return { lateFee: 0, daysOverdue: 0 };
  }
  
  const daysOverdue = daysDiff - config.gracePeriodDays;
  
  // Calculate percentage-based late fee
  let percentageFee = originalAmount * (config.percentageRate / 100);
  
  // Add flat fee if configured
  let totalFee = percentageFee + (config.flatFee || 0);
  
  // Apply maximum cap if configured
  if (config.maxPercentage) {
    const maxFee = originalAmount * (config.maxPercentage / 100);
    totalFee = Math.min(totalFee, maxFee);
  }
  
  // Round to 2 decimal places
  totalFee = Math.round(totalFee * 100) / 100;
  
  return { lateFee: totalFee, daysOverdue };
}

/**
 * Invoice Service - handles all invoice operations
 */
export const invoiceService = {
  /**
   * Get all invoices for a user
   */
  async getAll(userId: string): Promise<Invoice[]> {
    const prisma = getPrismaClient();
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { property: { userId } },
          { tenant: { userId } },
          { owner: { userId } },
        ],
      },
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return invoices.map(inv => ({
      id: inv.id,
      userId,
      number: inv.number,
      amount: inv.amount,
      dueDate: inv.dueDate.toISOString().split('T')[0],
      paidDate: inv.paidDate?.toISOString().split('T')[0],
      status: inv.status as Invoice['status'],
      description: inv.description || undefined,
      metadata: inv.metadata ? JSON.parse(inv.metadata) : undefined,
      propertyId: inv.propertyId || undefined,
      propertyName: inv.property?.name,
      ownerId: inv.ownerId || undefined,
      ownerName: inv.owner?.name,
      tenantId: inv.tenantId || undefined,
      tenantName: inv.tenant?.name,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    }));
  },

  /**
   * Get a single invoice by ID
   */
  async getById(userId: string, id: string): Promise<Invoice | null> {
    const prisma = getPrismaClient();
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        OR: [
          { property: { userId } },
          { tenant: { userId } },
          { owner: { userId } },
        ],
      },
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true } },
        owner: { select: { name: true } },
      },
    });
    
    if (!invoice) return null;
    
    return {
      id: invoice.id,
      userId,
      number: invoice.number,
      amount: invoice.amount,
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      paidDate: invoice.paidDate?.toISOString().split('T')[0],
      status: invoice.status as Invoice['status'],
      description: invoice.description || undefined,
      metadata: invoice.metadata ? JSON.parse(invoice.metadata) : undefined,
      propertyId: invoice.propertyId || undefined,
      propertyName: invoice.property?.name,
      ownerId: invoice.ownerId || undefined,
      ownerName: invoice.owner?.name,
      tenantId: invoice.tenantId || undefined,
      tenantName: invoice.tenant?.name,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  },

  /**
   * Create a new invoice
   */
  async create(userId: string, data: CreateInvoiceData): Promise<Invoice> {
    const prisma = getPrismaClient();
    const invoiceNumber = await generateInvoiceNumber(userId);
    
    const metadata: InvoiceMetadata = {
      lineItems: data.lineItems,
      notes: data.notes,
    };
    
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        number: invoiceNumber,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        status: 'pending',
        description: data.description || null,
        metadata: JSON.stringify(metadata),
        propertyId: data.propertyId || null,
        tenantId: data.tenantId || null,
        ownerId: data.ownerId || null,
      },
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true } },
        owner: { select: { name: true } },
      },
    });
    
    return {
      id: invoice.id,
      userId,
      number: invoice.number,
      amount: invoice.amount,
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      status: invoice.status as Invoice['status'],
      description: invoice.description || undefined,
      metadata,
      propertyId: invoice.propertyId || undefined,
      propertyName: invoice.property?.name,
      ownerId: invoice.ownerId || undefined,
      ownerName: invoice.owner?.name,
      tenantId: invoice.tenantId || undefined,
      tenantName: invoice.tenant?.name,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  },

  /**
   * Update an invoice
   */
  async update(
    userId: string,
    id: string,
    data: Partial<CreateInvoiceData> & { status?: Invoice['status']; paidDate?: string }
  ): Promise<Invoice> {
    const prisma = getPrismaClient();
    
    // Verify ownership
    const existing = await this.getById(userId, id);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    
    const updateData: Record<string, unknown> = {};
    
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.paidDate) updateData.paidDate = new Date(data.paidDate);
    if (data.propertyId !== undefined) updateData.propertyId = data.propertyId;
    if (data.tenantId !== undefined) updateData.tenantId = data.tenantId;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    
    if (data.lineItems || data.notes) {
      const existingMetadata = existing.metadata || {};
      updateData.metadata = JSON.stringify({
        ...existingMetadata,
        lineItems: data.lineItems || existingMetadata.lineItems,
        notes: data.notes || existingMetadata.notes,
      });
    }
    
    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true } },
        owner: { select: { name: true } },
      },
    });
    
    return {
      id: invoice.id,
      userId,
      number: invoice.number,
      amount: invoice.amount,
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      paidDate: invoice.paidDate?.toISOString().split('T')[0],
      status: invoice.status as Invoice['status'],
      description: invoice.description || undefined,
      metadata: invoice.metadata ? JSON.parse(invoice.metadata) : undefined,
      propertyId: invoice.propertyId || undefined,
      propertyName: invoice.property?.name,
      ownerId: invoice.ownerId || undefined,
      ownerName: invoice.owner?.name,
      tenantId: invoice.tenantId || undefined,
      tenantName: invoice.tenant?.name,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  },

  /**
   * Mark invoice as paid
   */
  async markAsPaid(
    userId: string,
    id: string,
    paymentMethod?: string,
    referenceNumber?: string
  ): Promise<Invoice> {
    const existing = await this.getById(userId, id);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    
    const metadata: InvoiceMetadata = {
      ...existing.metadata,
      paymentMethod,
      referenceNumber,
    };
    
    return this.update(userId, id, {
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
    });
  },

  /**
   * Apply late fees to overdue invoices
   */
  async applyLateFees(
    userId: string,
    config: LateFeeConfig = DEFAULT_LATE_FEE_CONFIG
  ): Promise<Invoice[]> {
    const prisma = getPrismaClient();
    const now = new Date();
    
    // Find all pending invoices that are past due
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'pending',
        dueDate: {
          lt: now,
        },
        OR: [
          { property: { userId } },
          { tenant: { userId } },
          { owner: { userId } },
        ],
      },
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true } },
        owner: { select: { name: true } },
      },
    });
    
    const updatedInvoices: Invoice[] = [];
    
    for (const invoice of overdueInvoices) {
      const existingMetadata: InvoiceMetadata = invoice.metadata 
        ? JSON.parse(invoice.metadata) 
        : {};
      
      // Skip if late fee already applied
      if (existingMetadata.lateFeeApplied) {
        continue;
      }
      
      const originalAmount = invoice.amount;
      const { lateFee, daysOverdue } = calculateLateFee(
        originalAmount,
        invoice.dueDate,
        config
      );
      
      if (lateFee > 0) {
        const newMetadata: InvoiceMetadata = {
          ...existingMetadata,
          lateFeeApplied: true,
          lateFeePercentage: config.percentageRate,
          lateFeeAmount: lateFee,
          daysOverdue,
        };
        
        const updated = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amount: originalAmount + lateFee,
            status: 'overdue',
            metadata: JSON.stringify(newMetadata),
          },
          include: {
            property: { select: { name: true } },
            tenant: { select: { name: true } },
            owner: { select: { name: true } },
          },
        });
        
        updatedInvoices.push({
          id: updated.id,
          userId,
          number: updated.number,
          amount: updated.amount,
          dueDate: updated.dueDate.toISOString().split('T')[0],
          paidDate: updated.paidDate?.toISOString().split('T')[0],
          status: updated.status as Invoice['status'],
          description: updated.description || undefined,
          metadata: newMetadata,
          propertyId: updated.propertyId || undefined,
          propertyName: updated.property?.name,
          ownerId: updated.ownerId || undefined,
          ownerName: updated.owner?.name,
          tenantId: updated.tenantId || undefined,
          tenantName: updated.tenant?.name,
          lateFee,
          originalAmount,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        });
      } else {
        // Just mark as overdue without late fee (within grace period)
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' },
        });
      }
    }
    
    return updatedInvoices;
  },

  /**
   * Delete an invoice
   */
  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.getById(userId, id);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    
    await getPrismaClient().invoice.delete({
      where: { id },
    });
  },

  /**
   * Generate batch invoices for all active tenants (monthly rent)
   */
  async generateBatchRentInvoices(
    userId: string,
    dueDate: string,
    month?: string // Optional: for description "Rent for January 2026"
  ): Promise<BatchInvoiceResult> {
    const prisma = getPrismaClient();
    const result: BatchInvoiceResult = {
      success: [],
      failed: [],
    };
    
    // Get all active leases for the user
    const activeLeases = await prisma.lease.findMany({
      where: {
        userId,
        status: 'active',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        tenant: true,
        property: true,
      },
    });
    
    const monthLabel = month || new Date(dueDate).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    
    for (const lease of activeLeases) {
      try {
        const invoice = await this.create(userId, {
          tenantId: lease.tenantId,
          propertyId: lease.propertyId,
          amount: lease.monthlyRent,
          dueDate,
          description: `Rent for ${monthLabel} - ${lease.property.name}`,
          lineItems: [
            {
              description: `Monthly Rent - ${lease.property.name}`,
              quantity: 1,
              unitPrice: lease.monthlyRent,
              total: lease.monthlyRent,
            },
          ],
        });
        
        result.success.push(invoice);
      } catch (error) {
        result.failed.push({
          tenantId: lease.tenantId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return result;
  },

  /**
   * Get invoices summary for reporting
   */
  async getSummary(userId: string, startDate?: string, endDate?: string): Promise<{
    totalPending: number;
    totalPaid: number;
    totalOverdue: number;
    totalLateFees: number;
    invoiceCount: { pending: number; paid: number; overdue: number; cancelled: number };
  }> {
    const prisma = getPrismaClient();
    
    const dateFilter: Record<string, unknown> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    const invoices = await prisma.invoice.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        OR: [
          { property: { userId } },
          { tenant: { userId } },
          { owner: { userId } },
        ],
      },
    });
    
    let totalPending = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let totalLateFees = 0;
    const invoiceCount = { pending: 0, paid: 0, overdue: 0, cancelled: 0 };
    
    for (const invoice of invoices) {
      const metadata: InvoiceMetadata = invoice.metadata 
        ? JSON.parse(invoice.metadata) 
        : {};
      
      switch (invoice.status) {
        case 'pending':
          totalPending += invoice.amount;
          invoiceCount.pending++;
          break;
        case 'paid':
          totalPaid += invoice.amount;
          invoiceCount.paid++;
          break;
        case 'overdue':
          totalOverdue += invoice.amount;
          invoiceCount.overdue++;
          if (metadata.lateFeeAmount) {
            totalLateFees += metadata.lateFeeAmount;
          }
          break;
        case 'cancelled':
          invoiceCount.cancelled++;
          break;
      }
    }
    
    return {
      totalPending: Math.round(totalPending * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      totalLateFees: Math.round(totalLateFees * 100) / 100,
      invoiceCount,
    };
  },
};

/**
 * Batch receipt creation from paid invoices
 */
export const batchReceiptService = {
  /**
   * Create receipts for all paid invoices that don't have receipts yet
   */
  async createFromPaidInvoices(userId: string): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const prisma = getPrismaClient();
    const result = { created: 0, skipped: 0, errors: [] as string[] };
    
    // Get all paid invoices with tenants and properties
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'paid',
        tenantId: { not: null },
        propertyId: { not: null },
        OR: [
          { property: { userId } },
          { tenant: { userId } },
        ],
      },
      include: {
        tenant: true,
        property: true,
      },
    });
    
    for (const invoice of paidInvoices) {
      if (!invoice.tenantId || !invoice.propertyId || !invoice.paidDate) {
        result.skipped++;
        continue;
      }
      
      // Check if receipt already exists for this invoice
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          tenantId: invoice.tenantId,
          propertyId: invoice.propertyId,
          amount: invoice.amount,
          date: invoice.paidDate,
        },
      });
      
      if (existingReceipt) {
        result.skipped++;
        continue;
      }
      
      try {
        await prisma.receipt.create({
          data: {
            userId,
            tenantId: invoice.tenantId,
            propertyId: invoice.propertyId,
            amount: invoice.amount,
            date: invoice.paidDate,
            type: 'rent',
            status: 'paid',
            description: `Payment for Invoice ${invoice.number}`,
          },
        });
        result.created++;
      } catch (error) {
        result.errors.push(
          `Failed to create receipt for invoice ${invoice.number}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
    
    return result;
  },
};

export default invoiceService;
