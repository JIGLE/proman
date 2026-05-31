import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { isMockMode } from "@/lib/config/data-mode";
import { contactService } from "@/lib/services/database/database.mock";
import { createSuccessResponse, withErrorHandler } from "@/lib/utils/error-handling";
import { withRateLimit } from "@/lib/utils/rate-limit";

// GET /api/contacts - List all maintenance contacts
async function handleGet(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (isMockMode) {
    const contacts = await contactService.getAll("mock-user", type || undefined);
    return createSuccessResponse(contacts);
  }

  const whereClause: Record<string, unknown> = {};
  if (type) whereClause.type = type;

  const prisma = getPrismaClient();
  const contacts = await prisma.maintenanceContact.findMany({
    where: whereClause,
    orderBy: { contactPerson: "asc" },
  });

  return createSuccessResponse(contacts);
}

// POST /api/contacts - Create a new maintenance contact
async function handlePost(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  if (isMockMode) {
    return createSuccessResponse({ error: "Write operations not supported in mock mode" }, 403);
  }

  const data = await request.json();

  const specialties = Array.isArray(data.specialties)
    ? data.specialties
    : data.specialties
      ? [data.specialties]
      : [];

  const hourlyRate = data.hourlyRate != null ? Number(data.hourlyRate) : null;
  const rating = data.rating != null ? Number(data.rating) : null;

  const prisma = getPrismaClient();
  const contact = await prisma.maintenanceContact.create({
    data: {
      userId: authResult.userId,
      contactPerson: data.name,
      company: data.company || null,
      type: data.type || "contractor",
      specialties: JSON.stringify(specialties),
      email: data.email || null,
      phone: data.phone || null,
      hourlyRate: Number.isNaN(hourlyRate) ? null : hourlyRate,
      currency: data.currency || "EUR",
      rating: Number.isNaN(rating) ? null : rating,
      notes: data.notes || null,
    },
  });

  return createSuccessResponse(contact, 201);
}

export const GET = withErrorHandler(withRateLimit(handleGet));
export const POST = withErrorHandler(withRateLimit(handlePost));
