import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { invoiceService } from '@/lib/services/invoice-service';
import { sanitizeForDatabase, sanitizeNumber } from '@/lib/utils/sanitize';
import { z } from 'zod';

// Validation schema for updates
const updateInvoiceSchema = z.object({
  amount: z.number().min(0.01).optional(),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  paidDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  tenantId: z.string().optional(),
  propertyId: z.string().optional(),
  ownerId: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
  })).optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/invoices/[id] - Get a single invoice
async function handleGet(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> }
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    const invoice = await invoiceService.getById(userId, id);
    
    if (!invoice) {
      return createErrorResponse(new Error('Invoice not found'), 404, request);
    }
    
    return createSuccessResponse(invoice);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// PUT /api/invoices/[id] - Update an invoice
async function handlePut(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> }
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody: Record<string, unknown> = {};
    
    if (body.amount !== undefined) sanitizedBody.amount = sanitizeNumber(body.amount, 0.01, 0.01);
    if (body.dueDate) sanitizedBody.dueDate = body.dueDate;
    if (body.description !== undefined) sanitizedBody.description = body.description ? sanitizeForDatabase(body.description) : undefined;
    if (body.status) sanitizedBody.status = body.status;
    if (body.paidDate) sanitizedBody.paidDate = body.paidDate;
    if (body.tenantId !== undefined) sanitizedBody.tenantId = body.tenantId ? sanitizeForDatabase(body.tenantId) : undefined;
    if (body.propertyId !== undefined) sanitizedBody.propertyId = body.propertyId ? sanitizeForDatabase(body.propertyId) : undefined;
    if (body.ownerId !== undefined) sanitizedBody.ownerId = body.ownerId ? sanitizeForDatabase(body.ownerId) : undefined;
    if (body.lineItems) sanitizedBody.lineItems = body.lineItems;
    if (body.notes !== undefined) sanitizedBody.notes = body.notes ? sanitizeForDatabase(body.notes) : undefined;

    // Validate input
    const validatedData = updateInvoiceSchema.parse(sanitizedBody);

    const invoice = await invoiceService.update(userId, id, validatedData);
    return createSuccessResponse(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        new Error(`Validation error: ${error.issues.map(e => e.message).join(', ')}`),
        400,
        request
      );
    }
    if (error instanceof Error && error.message === 'Invoice not found') {
      return createErrorResponse(error, 404, request);
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

// DELETE /api/invoices/[id] - Delete an invoice
async function handleDelete(
  request: NextRequest,
  context?: { params?: Record<string, string> | Promise<Record<string, string>> }
): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  let id: string | undefined;
  if (context?.params) {
    const maybe = context.params as Record<string, string> | Promise<Record<string, string>>;
    const resolved = (maybe instanceof Promise) ? await maybe : maybe;
    id = resolved?.id;
  }
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    await invoiceService.delete(userId, id);
    return createSuccessResponse({ message: 'Invoice deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invoice not found') {
      return createErrorResponse(error, 404, request);
    }
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handlers
export const GET = withErrorHandler(handleGet);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;
