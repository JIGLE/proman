import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { invoiceService, batchReceiptService, type LateFeeConfig } from '@/lib/invoice-service';
import { sanitizeForDatabase, sanitizeNumber } from '@/lib/sanitize';
import { z } from 'zod';

// Validation schemas
const createInvoiceSchema = z.object({
  tenantId: z.string().optional(),
  propertyId: z.string().optional(),
  ownerId: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  description: z.string().max(500).optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
  })).optional(),
  notes: z.string().max(1000).optional(),
});

const batchInvoiceSchema = z.object({
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  month: z.string().optional(),
});

const applyLateFeesSchema = z.object({
  enabled: z.boolean().default(true),
  gracePeriodDays: z.number().min(0).max(30).default(5),
  percentageRate: z.number().min(0).max(50).default(5),
  flatFee: z.number().min(0).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
});

// GET /api/invoices - Get all invoices
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const invoices = await invoiceService.getAll(userId);
    return createSuccessResponse(invoices);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// POST /api/invoices - Create a new invoice
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      tenantId: body.tenantId ? sanitizeForDatabase(body.tenantId) : undefined,
      propertyId: body.propertyId ? sanitizeForDatabase(body.propertyId) : undefined,
      ownerId: body.ownerId ? sanitizeForDatabase(body.ownerId) : undefined,
      amount: sanitizeNumber(body.amount, 0.01, 0.01),
      description: body.description ? sanitizeForDatabase(body.description) : undefined,
      notes: body.notes ? sanitizeForDatabase(body.notes) : undefined,
    };

    // Validate input
    const validatedData = createInvoiceSchema.parse(sanitizedBody);

    const invoice = await invoiceService.create(userId, validatedData);
    return createSuccessResponse(invoice, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        new Error(`Validation error: ${error.issues.map(e => e.message).join(', ')}`),
        400,
        request
      );
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handler
export const GET = withErrorHandler(handleGet);
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
