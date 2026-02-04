import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/services/auth/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/utils/error-handling';
import { tenantService } from '@/lib/services/database';
import { sanitizeForDatabase, sanitizeEmail, sanitizeNumber } from '@/lib/utils/sanitize';
import { getPaginationFromRequest, createPaginatedResponse } from '@/lib/utils/pagination';
import { getPrismaClient } from '@/lib/services/database/database';
import { z } from 'zod';

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(1).max(20),
  propertyId: z.string().optional(),
  rent: z.number().min(0),
  leaseStart: z.string().datetime(),
  leaseEnd: z.string().datetime(),
  paymentStatus: z.enum(['paid', 'overdue', 'pending']).default('pending'),
  notes: z.string().max(1000).optional(),
});

const _updateTenantSchema = createTenantSchema.partial();

// GET /api/tenants - Get all tenants for the authenticated user (with pagination)
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

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where: { userId },
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.tenant.count({ where: { userId } }),
      ]);

      return createSuccessResponse(createPaginatedResponse(tenants, total, pagination));
    } else {
      // Legacy: Return all tenants (backward compatible)
      const tenants = await tenantService.getAll(userId);
      return createSuccessResponse(tenants);
    }
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// POST /api/tenants - Create a new tenant
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();

    // Sanitize input
    const sanitizedBody = {
      ...body,
      name: sanitizeForDatabase(body.name),
      email: sanitizeEmail(body.email),
      phone: sanitizeForDatabase(body.phone),
      propertyId: body.propertyId ? sanitizeForDatabase(body.propertyId) : undefined,
      rent: sanitizeNumber(body.rent, 0, 0),
      notes: body.notes ? sanitizeForDatabase(body.notes) : undefined,
    };

    // Validate input
    const validatedData = createTenantSchema.parse(sanitizedBody);

    const tenant = await tenantService.create(userId, validatedData);
    return createSuccessResponse(tenant, 201);
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
