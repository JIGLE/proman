import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { receiptService } from '@/lib/services/database';
import { sanitizeForDatabase, sanitizeNumber } from '@/lib/utils/sanitize';
import { getPaginationFromRequest, createPaginatedResponse } from '@/lib/utils/pagination';
import { getPrismaClient } from '@/lib/services/database/database';
import { z } from 'zod';

// Validation schemas
const createReceiptSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  amount: z.number().min(0.01),
  date: z.string().datetime(),
  type: z.enum(['rent', 'deposit', 'maintenance', 'other']),
  status: z.enum(['paid', 'pending']).default('paid'),
  description: z.string().max(500).optional(),
});

const _updateReceiptSchema = createReceiptSchema.partial();

// GET /api/receipts - Get all receipts for the authenticated user (with pagination)
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    // Check if pagination is requested
    const url = new URL(request.url);
    const usePagination = url.searchParams.has('page') || url.searchParams.has('limit');

    if (usePagination) {
      // Paginated response
      const pagination = getPaginationFromRequest(request, 50, 100);
      const prisma = getPrismaClient();

      const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
          where: { userId },
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { date: 'desc' },
        }),
        prisma.receipt.count({ where: { userId } }),
      ]);

      return createSuccessResponse(createPaginatedResponse(receipts, total, pagination));
    } else {
      // Legacy: Return all receipts (backward compatible)
      const receipts = await receiptService.getAll(userId);
      return createSuccessResponse(receipts);
    }
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// POST /api/receipts - Create a new receipt
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      tenantId: sanitizeForDatabase(body.tenantId),
      propertyId: sanitizeForDatabase(body.propertyId),
      amount: sanitizeNumber(body.amount, 0.01, 0.01),
      description: body.description ? sanitizeForDatabase(body.description) : undefined,
    };

    // Validate input
    const validatedData = createReceiptSchema.parse(sanitizedBody);

    const receipt = await receiptService.create(userId, validatedData);
    return createSuccessResponse(receipt, 201);
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
