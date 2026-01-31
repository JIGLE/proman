// Invoice Online Payment - Create payment intent for invoice
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/error-handling';
import { paymentService, portugalPaymentService, spainPaymentService } from '@/lib/payment';
import { getPrismaClient } from '@/lib/database';
import { z } from 'zod';
import type { PrismaClient, PaymentMethodType } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const initiatePaymentSchema = z.object({
  paymentMethodType: z.enum(['card', 'sepa_debit', 'multibanco', 'mbway', 'bank_transfer']),
  country: z.string().default('PT'),
  // For MB WAY
  mbwayPhone: z.string().optional(),
});

/**
 * POST /api/invoices/[id]/initiate-payment - Create a payment intent for an invoice
 * 
 * This endpoint creates a Stripe PaymentIntent (or regional payment request) for an invoice,
 * allowing the tenant to pay online via card, SEPA, Multibanco, or MB WAY.
 */
export async function POST(
  request: NextRequest,
  context: RouteParams
): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { id: invoiceId } = await context.params;
    const body = await request.json();
    const validated = initiatePaymentSchema.parse(body);

    const prisma: PrismaClient = getPrismaClient();

    // Get invoice with tenant info
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: { select: { id: true, name: true, userId: true } },
      },
    });

    if (!invoice) {
      return createErrorResponse(new ValidationError('Invoice not found'), 404, request);
    }

    // Verify user owns this invoice
    if (invoice.userId !== authResult.userId && invoice.tenant?.userId !== authResult.userId) {
      return createErrorResponse(new ValidationError('Invoice not found'), 404, request);
    }

    // Check invoice status
    if (invoice.status === 'paid') {
      return createErrorResponse(new ValidationError('Invoice is already paid'), 400, request);
    }

    if (invoice.status === 'cancelled') {
      return createErrorResponse(new ValidationError('Invoice has been cancelled'), 400, request);
    }

    // Verify tenant exists for payment
    if (!invoice.tenantId) {
      return createErrorResponse(
        new ValidationError('Invoice must be associated with a tenant for online payment'),
        400,
        request
      );
    }

    // Check payment service
    if (!paymentService.isReady()) {
      return createErrorResponse(
        new Error('Payment service not configured. Please set STRIPE_SECRET_KEY.'),
        503,
        request
      );
    }

    // Amount in cents
    const amountCents = Math.round(invoice.amount * 100);

    // Handle region-specific payments
    if (validated.paymentMethodType === 'multibanco' && validated.country === 'PT') {
      // Portugal: Multibanco
      const result = await portugalPaymentService.createMultibancoPayment(
        invoice.tenantId,
        amountCents,
        invoiceId,
        `Payment for invoice ${invoice.number}`
      );

      if (!result.success) {
        return createErrorResponse(new Error(result.error || 'Failed to create Multibanco payment'), 400, request);
      }

      // Format Multibanco reference for display
      const formattedReference = result.multibancoReference 
        ? portugalPaymentService.formatMultibancoReference(result.multibancoReference)
        : undefined;

      return createSuccessResponse({
        ...result,
        multibancoReferenceFormatted: formattedReference,
        invoiceNumber: invoice.number,
        amount: invoice.amount,
        amountFormatted: portugalPaymentService.formatAmountPT(amountCents),
      });
    }

    if (validated.paymentMethodType === 'mbway' && validated.country === 'PT') {
      // Portugal: MB WAY (placeholder - requires SIBS)
      if (!validated.mbwayPhone) {
        return createErrorResponse(
          new ValidationError('Phone number is required for MB WAY payments'),
          400,
          request
        );
      }

      // Validate phone
      if (!portugalPaymentService.validatePortuguesePhone(validated.mbwayPhone)) {
        return createErrorResponse(
          new ValidationError('Invalid Portuguese phone number. Must be 9 digits starting with 9.'),
          400,
          request
        );
      }

      return createErrorResponse(
        new Error('MB WAY integration requires SIBS API setup. Please contact administrator.'),
        501,
        request
      );
    }

    // Standard Stripe payment (card, SEPA, bank_transfer)
    const result = await paymentService.createPaymentIntent({
      tenantId: invoice.tenantId,
      amount: amountCents,
      currency: 'EUR',
      paymentMethodType: validated.paymentMethodType as PaymentMethodType,
      invoiceId,
      description: `Payment for invoice ${invoice.number}`,
      metadata: {
        country: validated.country,
        invoiceNumber: invoice.number,
      },
    });

    if (!result.success) {
      return createErrorResponse(new Error(result.error || 'Failed to create payment'), 400, request);
    }

    return createSuccessResponse({
      ...result,
      invoiceNumber: invoice.number,
      amount: invoice.amount,
      amountFormatted: validated.country === 'ES' 
        ? spainPaymentService.formatAmountES(amountCents)
        : portugalPaymentService.formatAmountPT(amountCents),
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return createErrorResponse(
        new ValidationError(zodError.issues[0]?.message || 'Validation error'),
        400,
        request
      );
    }
    console.error('Initiate payment error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to initiate payment'),
      500,
      request
    );
  }
}
