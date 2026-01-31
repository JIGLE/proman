import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { invoiceService } from '@/lib/invoice-service';
import { sanitizeForDatabase } from '@/lib/sanitize';
import { z } from 'zod';

// Validation schema for marking as paid
const markPaidSchema = z.object({
  paymentMethod: z.string().max(100).optional(),
  referenceNumber: z.string().max(100).optional(),
});

// POST /api/invoices/[id]/pay - Mark invoice as paid
async function handlePost(
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
    const body = await request.json().catch(() => ({}));

    // Sanitize input
    const sanitizedBody = {
      paymentMethod: body.paymentMethod ? sanitizeForDatabase(body.paymentMethod) : undefined,
      referenceNumber: body.referenceNumber ? sanitizeForDatabase(body.referenceNumber) : undefined,
    };

    // Validate input
    const validatedData = markPaidSchema.parse(sanitizedBody);

    const invoice = await invoiceService.markAsPaid(
      userId,
      id,
      validatedData.paymentMethod,
      validatedData.referenceNumber
    );

    return createSuccessResponse({
      message: 'Invoice marked as paid',
      invoice,
    });
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

// Main handler
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
