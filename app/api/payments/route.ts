// Payment API - Create payment intents and manage payments
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/services/auth/auth-middleware';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/error-handling';
import { paymentService } from '@/lib/payment';
import { getPrismaClient } from '@/lib/database';
import { z } from 'zod';
import type { PrismaClient, PaymentMethodType } from '@prisma/client';

const createPaymentIntentSchema = z.object({
  tenantId: z.string().min(1),
  amount: z.number().positive(), // Amount in cents
  currency: z.string().default('EUR'),
  paymentMethodType: z.enum(['card', 'sepa_debit', 'multibanco', 'mbway', 'bank_transfer', 'cash', 'other']),
  invoiceId: z.string().optional(),
  description: z.string().optional(),
});

/**
 * GET /api/payments - List payment transactions for current user
 */
export async function GET(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const prisma: PrismaClient = getPrismaClient();
    const { searchParams } = new URL(request.url);
    
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query based on filters
    const where: Record<string, unknown> = {};
    
    if (tenantId) {
      // Verify user owns this tenant
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, userId: authResult.userId },
      });
      if (!tenant) {
        return createErrorResponse(new ValidationError('Tenant not found'), 404, request);
      }
      where.tenantId = tenantId;
    } else {
      // Get all tenants owned by user
      const userTenants = await prisma.tenant.findMany({
        where: { userId: authResult.userId },
        select: { id: true },
      });
      where.tenantId = { in: userTenants.map(t => t.id) };
    }

    if (status) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          invoice: { select: { id: true, number: true, amount: true } },
        },
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return createSuccessResponse({
      transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
    });
  } catch (error: unknown) {
    console.error('Payment list error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to list payments'), 
      500, 
      request
    );
  }
}

/**
 * POST /api/payments - Create a new payment intent
 */
export async function POST(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const validated = createPaymentIntentSchema.parse(body);

    const prisma: PrismaClient = getPrismaClient();

    // Verify user owns this tenant
    const tenant = await prisma.tenant.findFirst({
      where: { id: validated.tenantId, userId: authResult.userId },
    });

    if (!tenant) {
      return createErrorResponse(new ValidationError('Tenant not found'), 404, request);
    }

    // Verify invoice if provided
    if (validated.invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: validated.invoiceId, tenantId: validated.tenantId },
      });
      if (!invoice) {
        return createErrorResponse(new ValidationError('Invoice not found'), 404, request);
      }
    }

    // Check if payment service is configured
    if (!paymentService.isReady()) {
      return createErrorResponse(
        new Error('Payment service not configured. Please set STRIPE_SECRET_KEY.'),
        503,
        request
      );
    }

    // Create payment intent
    const result = await paymentService.createPaymentIntent({
      tenantId: validated.tenantId,
      amount: validated.amount,
      currency: validated.currency,
      paymentMethodType: validated.paymentMethodType as PaymentMethodType,
      invoiceId: validated.invoiceId,
      description: validated.description,
    });

    if (!result.success) {
      return createErrorResponse(new Error(result.error || 'Payment creation failed'), 400, request);
    }

    return createSuccessResponse(result, 201);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return createErrorResponse(new ValidationError(zodError.issues[0]?.message || 'Validation error'), 400, request);
    }
    console.error('Payment creation error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to create payment'), 
      500, 
      request
    );
  }
}
