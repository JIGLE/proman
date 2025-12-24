import { NextRequest } from 'next/server';
import { requireAuth, handleOptions } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse, withErrorHandler } from '@/lib/error-handling';
import { propertyService } from '@/lib/database';
import { sanitizeForDatabase, sanitizeNumber } from '@/lib/sanitize';
import { withRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const createPropertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  type: z.enum(['apartment', 'house', 'condo', 'townhouse', 'other']),
  bedrooms: z.number().min(0).max(100),
  bathrooms: z.number().min(0).max(100),
  rent: z.number().min(0),
  status: z.enum(['occupied', 'vacant', 'maintenance']).default('vacant'),
  description: z.string().max(1000).optional(),
  image: z.string().url().optional(),
});

// GET /api/properties - Get all properties for the authenticated user
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { userId } = authResult;

  try {
    const properties = await propertyService.getAll(userId);
    return createSuccessResponse(properties);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// POST /api/properties - Create a new property
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
      address: sanitizeForDatabase(body.address),
      description: body.description ? sanitizeForDatabase(body.description) : undefined,
      image: body.image ? sanitizeForDatabase(body.image) : undefined,
      bedrooms: sanitizeNumber(body.bedrooms, 0, 0, 100),
      bathrooms: sanitizeNumber(body.bathrooms, 0, 0, 100),
      rent: sanitizeNumber(body.rent, 0, 0),
    };

    // Validate input
    const validatedData = createPropertySchema.parse(sanitizedBody);

    const property = await propertyService.create(userId, validatedData);
    return createSuccessResponse(property, 201);
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
export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
export const OPTIONS = handleOptions;