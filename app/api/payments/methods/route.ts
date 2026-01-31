// Payment Methods API - Manage tenant payment methods
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/error-handling';
import { paymentService } from '@/lib/payment';
import { getPrismaClient } from '@/lib/database';
import { z } from 'zod';
import type { PrismaClient, PaymentMethodType } from '@prisma/client';

const addPaymentMethodSchema = z.object({
  tenantId: z.string().min(1),
  type: z.enum(['card', 'sepa_debit', 'multibanco', 'mbway', 'bank_transfer', 'cash', 'other']),
  // For SEPA
  iban: z.string().optional(),
  accountHolder: z.string().optional(),
  // For MB WAY
  mbwayPhone: z.string().optional(),
  // Country
  country: z.string().default('PT'),
  isDefault: z.boolean().default(false),
});

/**
 * GET /api/payments/methods - Get payment methods for a tenant
 */
export async function GET(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const prisma: PrismaClient = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const country = searchParams.get('country');

    if (!tenantId) {
      return createErrorResponse(new ValidationError('tenantId is required'), 400, request);
    }

    // Verify user owns this tenant
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, userId: authResult.userId },
      include: { property: { select: { address: true } } },
    });

    if (!tenant) {
      return createErrorResponse(new ValidationError('Tenant not found'), 404, request);
    }

    // Get saved payment methods
    const methods = await prisma.paymentMethod.findMany({
      where: { 
        tenantId,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Determine country from address or parameter
    let detectedCountry = country || 'PT';
    if (!country && tenant.property?.address) {
      // Simple country detection from address
      const addr = tenant.property.address.toUpperCase();
      if (addr.includes('SPAIN') || addr.includes('ESPAÑA') || addr.includes('MADRID') || addr.includes('BARCELONA')) {
        detectedCountry = 'ES';
      }
    }

    // Get available payment method types for region
    const availableTypes = paymentService.getAvailablePaymentMethods(detectedCountry);

    // Get info for each available type
    const availableMethods = availableTypes.map(type => ({
      type,
      ...paymentService.getPaymentMethodInfo(type),
    }));

    return createSuccessResponse({
      savedMethods: methods,
      availableMethods,
    });
  } catch (error: unknown) {
    console.error('Get payment methods error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to get payment methods'), 
      500, 
      request
    );
  }
}

/**
 * POST /api/payments/methods - Add a new payment method
 */
export async function POST(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const validated = addPaymentMethodSchema.parse(body);

    const prisma: PrismaClient = getPrismaClient();

    // Verify user owns this tenant
    const tenant = await prisma.tenant.findFirst({
      where: { id: validated.tenantId, userId: authResult.userId },
    });

    if (!tenant) {
      return createErrorResponse(new ValidationError('Tenant not found'), 404, request);
    }

    // Handle SEPA setup
    if (validated.type === 'sepa_debit') {
      if (!validated.iban || !validated.accountHolder) {
        return createErrorResponse(
          new ValidationError('IBAN and account holder name are required for SEPA'),
          400,
          request
        );
      }

      // Import region-specific service
      if (validated.country === 'PT') {
        const { portugalPaymentService } = await import('@/lib/payment/methods/portugal');
        const result = await portugalPaymentService.createSEPAMandate(
          validated.tenantId,
          validated.iban,
          validated.accountHolder
        );
        
        if (!result.success) {
          return createErrorResponse(new Error(result.error), 400, request);
        }

        return createSuccessResponse({ mandateId: result.mandateId }, 201);
      } else if (validated.country === 'ES') {
        const { spainPaymentService } = await import('@/lib/payment/methods/spain');
        const result = await spainPaymentService.createSEPAMandate(
          validated.tenantId,
          validated.iban,
          validated.accountHolder
        );
        
        if (!result.success) {
          return createErrorResponse(new Error(result.error), 400, request);
        }

        return createSuccessResponse({ mandateId: result.mandateId }, 201);
      }
    }

    // Handle MB WAY setup (Portugal only)
    if (validated.type === 'mbway') {
      if (validated.country !== 'PT') {
        return createErrorResponse(
          new ValidationError('MB WAY is only available in Portugal'),
          400,
          request
        );
      }

      if (!validated.mbwayPhone) {
        return createErrorResponse(
          new ValidationError('Phone number is required for MB WAY'),
          400,
          request
        );
      }

      // Create payment method record
      const method = await prisma.paymentMethod.create({
        data: {
          tenantId: validated.tenantId,
          type: 'mbway',
          provider: 'mbway',
          country: 'PT',
          mbwayPhone: validated.mbwayPhone,
          isDefault: validated.isDefault,
          isActive: true,
        },
      });

      return createSuccessResponse(method, 201);
    }

    // For card and other methods, create a placeholder
    const method = await prisma.paymentMethod.create({
      data: {
        tenantId: validated.tenantId,
        type: validated.type as PaymentMethodType,
        provider: validated.type === 'card' ? 'stripe' : 'manual',
        country: validated.country,
        isDefault: validated.isDefault,
        isActive: true,
      },
    });

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          tenantId: validated.tenantId,
          id: { not: method.id },
        },
        data: { isDefault: false },
      });
    }

    return createSuccessResponse(method, 201);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return createErrorResponse(new ValidationError(zodError.issues[0]?.message || 'Validation error'), 400, request);
    }
    console.error('Add payment method error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to add payment method'), 
      500, 
      request
    );
  }
}

/**
 * DELETE /api/payments/methods - Deactivate a payment method
 */
export async function DELETE(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const prisma: PrismaClient = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const methodId = searchParams.get('id');

    if (!methodId) {
      return createErrorResponse(new ValidationError('Payment method ID is required'), 400, request);
    }

    // Find and verify ownership
    const method = await prisma.paymentMethod.findFirst({
      where: { id: methodId },
      include: { tenant: { select: { userId: true } } },
    });

    if (!method || method.tenant.userId !== authResult.userId) {
      return createErrorResponse(new ValidationError('Payment method not found'), 404, request);
    }

    // Soft delete (deactivate)
    await prisma.paymentMethod.update({
      where: { id: methodId },
      data: { isActive: false },
    });

    return createSuccessResponse({ message: 'Payment method removed' });
  } catch (error: unknown) {
    console.error('Delete payment method error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to remove payment method'), 
      500, 
      request
    );
  }
}
