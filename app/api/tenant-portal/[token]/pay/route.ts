/**
 * Tenant Portal Payment API
 * POST /api/tenant-portal/[token]/pay - Initiate payment for tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/services/database/database';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/utils/error-handling';
import { verifyPortalToken } from '@/lib/services/auth/tenant-portal-auth';
import { paymentService } from '@/lib/payment/payment-service';
import { portugalPaymentService } from '@/lib/payment/methods/portugal';
import { z } from 'zod';

const PaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethodType: z.enum(['card', 'sepa_debit', 'multibanco', 'mbway', 'bank_transfer']),
  country: z.enum(['PT', 'ES']).optional().default('PT'),
  mbwayPhone: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response | NextResponse> {
  try {
    const { token } = await params;
    
    if (!token) {
      return createErrorResponse(new ValidationError('Token is required'), 400, request);
    }
    
    // Verify token
    const tokenData = await verifyPortalToken(token);
    if (!tokenData) {
      return createErrorResponse(new Error('Invalid or expired token'), 401, request);
    }
    
    const body = await request.json();
    const validatedData = PaymentSchema.safeParse(body);
    
    if (!validatedData.success) {
      return createErrorResponse(
        new ValidationError(validatedData.error.issues[0]?.message || 'Validation error'),
        400,
        request
      );
    }
    
    const { invoiceId, amount, paymentMethodType, country, mbwayPhone } = validatedData.data;
    const prisma = getPrismaClient();
    
    // Verify tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tokenData.tenantId },
      include: {
        property: {
          select: { address: true },
        },
      },
    });
    
    if (!tenant) {
      return createErrorResponse(new ValidationError('Tenant not found'), 404, request);
    }
    
    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId: tenant.id,
        status: { notIn: ['paid', 'cancelled'] },
      },
    });
    
    if (!invoice) {
      return createErrorResponse(
        new ValidationError('Invoice not found or already paid'),
        404,
        request
      );
    }
    
    // Determine region from property address or default
    const isPortugal = country === 'PT' || 
      tenant.property?.address?.toLowerCase().includes('portugal') ||
      tenant.property?.address?.match(/\d{4}-\d{3}/); // Portuguese postal code format
    
    // Create payment based on method
    let result;
    const amountInCents = Math.round(amount * 100);
    
    switch (paymentMethodType) {
      case 'multibanco':
        if (!isPortugal) {
          return createErrorResponse(
            new ValidationError('Multibanco is only available in Portugal'),
            400,
            request
          );
        }
        result = await portugalPaymentService.createMultibancoPayment(
          tenant.id,
          amountInCents,
          invoice.id,
          `Invoice ${invoice.number}`
        );
        break;
        
      case 'mbway':
        if (!isPortugal) {
          return createErrorResponse(
            new ValidationError('MB WAY is only available in Portugal'),
            400,
            request
          );
        }
        if (!mbwayPhone) {
          return createErrorResponse(
            new ValidationError('Phone number required for MB WAY'),
            400,
            request
          );
        }
        result = await portugalPaymentService.createMBWayPayment({
          phoneNumber: mbwayPhone,
          amount: amountInCents,
          description: `Invoice ${invoice.number}`,
        });
        break;
        
      case 'sepa_debit':
        // Use region-specific SEPA
        if (isPortugal) {
          // For SEPA, we need a mandate first - return info for setup
          return createSuccessResponse({
            requiresSetup: true,
            setupType: 'sepa_mandate',
            message: 'SEPA Direct Debit requires mandate setup. Please contact your property manager.',
          });
        } else {
          return createSuccessResponse({
            requiresSetup: true,
            setupType: 'sepa_mandate',
            message: 'SEPA Direct Debit requires mandate setup. Please contact your property manager.',
          });
        }
        
      case 'bank_transfer':
        // Return bank details for manual transfer
        return createSuccessResponse({
          paymentType: 'bank_transfer',
          message: 'Please use the following details for bank transfer',
          bankDetails: isPortugal ? {
            reference: invoice.number,
            amount: amount,
            currency: 'EUR',
            note: 'Contact property manager for bank account details',
          } : {
            reference: invoice.number,
            amount: amount,
            currency: 'EUR',
            note: 'Contact property manager for bank account details',
          },
        });
        
      case 'card':
      default:
        // Use Stripe for card payments
        result = await paymentService.createPaymentIntent({
          tenantId: tenant.id,
          amount: Math.round(amount * 100),
          currency: 'EUR',
          paymentMethodType: 'card',
          invoiceId: invoice.id,
          description: `Invoice ${invoice.number}`,
        });
        break;
    }
    
    if (!result.success) {
      return createErrorResponse(
        new Error(result.error || 'Payment creation failed'),
        400,
        request
      );
    }
    
    // Build response based on payment method type
    const response: Record<string, unknown> = {
      success: true,
    };
    
    // PaymentIntentResult fields (for card/Multibanco via Stripe)
    if ('paymentIntentId' in result && result.paymentIntentId) {
      response.paymentIntentId = result.paymentIntentId;
    }
    if ('clientSecret' in result && result.clientSecret) {
      response.clientSecret = result.clientSecret;
    }
    if ('entity' in result && result.entity) {
      response.entity = result.entity;
    }
    if ('reference' in result && result.reference) {
      response.reference = result.reference;
    }
    
    // MBWayResponse fields
    if ('requestId' in result && result.requestId) {
      response.requestId = result.requestId;
    }
    if ('status' in result && result.status) {
      response.status = result.status;
    }
    
    return createSuccessResponse(response, 201);
    
  } catch (error) {
    console.error('Tenant portal payment error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Payment processing failed'),
      500,
      request
    );
  }
}
