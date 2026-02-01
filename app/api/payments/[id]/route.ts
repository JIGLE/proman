// Payment Transaction Detail API
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/services/auth/auth-middleware';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/utils/error-handling';
import { getPrismaClient } from '@/lib/services/database/database';
import type { PrismaClient } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id] - Get payment transaction details
 */
export async function GET(
  request: NextRequest, 
  context: RouteParams
): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await context.params;
    const prisma: PrismaClient = getPrismaClient();

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { id: true, name: true, email: true, userId: true },
        },
        invoice: {
          select: { id: true, number: true, amount: true, status: true },
        },
        paymentMethod: {
          select: { id: true, type: true, provider: true, ibanLast4: true },
        },
      },
    });

    if (!transaction) {
      return createErrorResponse(new ValidationError('Transaction not found'), 404, request);
    }

    // Verify ownership
    if (transaction.tenant.userId !== authResult.userId) {
      return createErrorResponse(new ValidationError('Transaction not found'), 404, request);
    }

    return createSuccessResponse(transaction);
  } catch (error: unknown) {
    console.error('Get transaction error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to get transaction'),
      500,
      request
    );
  }
}
