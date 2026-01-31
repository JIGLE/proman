import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { invoiceService } from '@/lib/invoice-service';
import { z } from 'zod';

// Validation schema for batch invoice generation
const batchInvoiceSchema = z.object({
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  month: z.string().optional(), // e.g., "February 2026"
});

// POST /api/invoices/batch - Generate batch rent invoices for all active tenants
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Validate input
    const validatedData = batchInvoiceSchema.parse(body);

    const result = await invoiceService.generateBatchRentInvoices(
      userId,
      validatedData.dueDate,
      validatedData.month
    );

    return createSuccessResponse({
      message: `Generated ${result.success.length} invoices`,
      successCount: result.success.length,
      failedCount: result.failed.length,
      invoices: result.success,
      failures: result.failed,
    }, 201);
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
export const POST = withErrorHandler(handlePost);
export const OPTIONS = handleOptions;
