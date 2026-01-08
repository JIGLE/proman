import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { receiptService } from '@/lib/database';
import { sanitizeForDatabase, sanitizeNumber } from '@/lib/sanitize';
import { z } from 'zod';

// Validation schema for updates
const updateReceiptSchema = z.object({
  tenantId: z.string().min(1).optional(),
  propertyId: z.string().min(1).optional(),
  amount: z.number().min(0.01).optional(),
  date: z.string().datetime().optional(),
  type: z.enum(['rent', 'deposit', 'maintenance', 'other']).optional(),
  status: z.enum(['paid', 'pending']).optional(),
  description: z.string().max(500).optional(),
});

// GET /api/receipts/[id] - Get a specific receipt
async function handleGet(request: NextRequest, context?: any): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const id = context?.params?.id;
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    const receipt = await receiptService.getById(userId, id);

    if (!receipt) {
      return createErrorResponse(new Error('Receipt not found'), 404, request);
    }

    return createSuccessResponse(receipt);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// PUT /api/receipts/[id] - Update a specific receipt
async function handlePut(request: NextRequest, context?: any): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const id = context?.params?.id;
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    // First check if receipt exists and user owns it
    const existingReceipt = await receiptService.getById(userId, id);
    if (!existingReceipt) {
      return createErrorResponse(new Error('Receipt not found'), 404, request);
    }

    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      tenantId: body.tenantId ? sanitizeForDatabase(body.tenantId) : undefined,
      propertyId: body.propertyId ? sanitizeForDatabase(body.propertyId) : undefined,
      amount: body.amount !== undefined ? sanitizeNumber(body.amount, 0.01, 0.01) : undefined,
      description: body.description ? sanitizeForDatabase(body.description) : undefined,
    };

    // Validate input
    const validatedData = updateReceiptSchema.parse(sanitizedBody);

    const receipt = await receiptService.update(userId, id, validatedData);
    return createSuccessResponse(receipt);
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

// DELETE /api/receipts/[id] - Delete a specific receipt
async function handleDelete(request: NextRequest, context?: any): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;
  const id = context?.params?.id;
  if (!id) return createErrorResponse(new Error('Invalid request: missing id'), 400, request);

  try {
    // First check if receipt exists and user owns it
    const existingReceipt = await receiptService.getById(userId, id);
    if (!existingReceipt) {
      return createErrorResponse(new Error('Receipt not found'), 404, request);
    }

    await receiptService.delete(userId, id);
    return createSuccessResponse({ message: 'Receipt deleted successfully' });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// Main handler
export const GET = withErrorHandler(handleGet);
export const PUT = withErrorHandler(handlePut);
export const DELETE = withErrorHandler(handleDelete);
export const OPTIONS = handleOptions;