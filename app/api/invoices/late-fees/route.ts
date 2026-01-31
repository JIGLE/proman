import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { invoiceService, type LateFeeConfig } from '@/lib/invoice-service';
import { z } from 'zod';

// Validation schema for late fee configuration
const lateFeeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  gracePeriodDays: z.number().min(0).max(30).default(5),
  percentageRate: z.number().min(0).max(50).default(5),
  flatFee: z.number().min(0).optional(),
  maxPercentage: z.number().min(0).max(100).optional(),
});

// POST /api/invoices/late-fees - Apply late fees to overdue invoices
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Validate and use custom config if provided, otherwise use defaults
    const config: LateFeeConfig = body && Object.keys(body).length > 0
      ? lateFeeConfigSchema.parse(body)
      : {
          enabled: true,
          gracePeriodDays: 5,
          percentageRate: 5,
          flatFee: 0,
          maxPercentage: 25,
        };

    const updatedInvoices = await invoiceService.applyLateFees(userId, config);

    return createSuccessResponse({
      message: `Applied late fees to ${updatedInvoices.length} invoices`,
      count: updatedInvoices.length,
      invoices: updatedInvoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        originalAmount: inv.originalAmount,
        lateFee: inv.lateFee,
        newAmount: inv.amount,
        tenantName: inv.tenantName,
        propertyName: inv.propertyName,
      })),
      config,
    });
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
