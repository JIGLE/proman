/**
 * Tenant Portal Link Generation API
 * POST /api/tenants/[id]/portal-link - Generate portal link for tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { createSuccessResponse, createErrorResponse, ValidationError } from '@/lib/error-handling';
import { getPrismaClient } from '@/lib/database';
import { tenantPortalService } from '@/lib/tenant-portal-auth';
import { z } from 'zod';

const GenerateLinkSchema = z.object({
  sendEmail: z.boolean().optional().default(false),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  
  try {
    const { id: tenantId } = await params;
    
    if (!tenantId) {
      return createErrorResponse(new ValidationError('Tenant ID is required'), 400, request);
    }
    
    const body = await request.json().catch(() => ({}));
    const validatedData = GenerateLinkSchema.safeParse(body);
    
    if (!validatedData.success) {
      return createErrorResponse(
        new ValidationError(validatedData.error.issues[0]?.message || 'Validation error'),
        400,
        request
      );
    }
    
    const { sendEmail } = validatedData.data;
    const prisma = getPrismaClient();
    
    // Verify tenant belongs to user
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    
    if (!tenant) {
      return createErrorResponse(new ValidationError('Tenant not found'), 404, request);
    }
    
    // Generate portal link
    const portalLink = tenantPortalService.generateLink(tenantId, userId);
    
    let emailSent = false;
    let emailError: string | undefined;
    
    // Optionally send invitation email
    if (sendEmail) {
      const result = await tenantPortalService.sendInvitation(tenantId, userId);
      emailSent = result.success;
      emailError = result.error;
    }
    
    return createSuccessResponse({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
      },
      portalLink,
      expiresIn: '30 days',
      emailSent,
      emailError,
    });
  } catch (error) {
    console.error('Portal link generation error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to generate portal link'),
      500,
      request
    );
  }
}
