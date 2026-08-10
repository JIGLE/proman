import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import {
  ResourceNotFoundError,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/utils/error-handling";
import { getPrismaClient } from "@/lib/services/database/database";

/**
 * Every handler here scopes to the caller. MaintenanceContact carries a userId, and this file
 * previously looked contacts up by id alone — so any signed-in user could read, edit or delete
 * another landlord's contractor records (names, emails, phones, rates, private notes) by id.
 * proxy.ts gates /api/** behind a session, but it only checks that one exists, never whose.
 *
 * A contact belonging to someone else answers 404, identical to one that does not exist, so a
 * guessed id is not confirmed.
 */

async function resolveId(
  params: Promise<{ id: string }> | { id: string },
): Promise<string | undefined> {
  const resolved = params instanceof Promise ? await params : params;
  return resolved?.id;
}

// GET /api/contacts/[id] - Get a single maintenance contact
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { userId } = authResult;
    const id = await resolveId(params);
    if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

    const prisma = getPrismaClient();
    const contact = await prisma.maintenanceContact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      return createErrorResponse(new ResourceNotFoundError("Contact"), 404, request);
    }

    return createSuccessResponse(contact);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// PUT /api/contacts/[id] - Update a maintenance contact
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { userId } = authResult;
    const id = await resolveId(params);
    if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

    const prisma = getPrismaClient();
    const existing = await prisma.maintenanceContact.findFirst({ where: { id, userId } });
    if (!existing) {
      return createErrorResponse(new ResourceNotFoundError("Contact"), 404, request);
    }

    const data = await request.json();

    const contact = await prisma.maintenanceContact.update({
      where: { id },
      data: {
        contactPerson: data.name,
        company: data.company || null,
        type: data.type,
        specialties: JSON.stringify(data.specialties || []),
        email: data.email || null,
        phone: data.phone || null,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
        currency: data.currency || "EUR",
        rating: data.rating ? parseFloat(data.rating) : null,
        notes: data.notes || null,
      },
    });

    return createSuccessResponse(contact);
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}

// DELETE /api/contacts/[id] - Delete a maintenance contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { userId } = authResult;
    const id = await resolveId(params);
    if (!id) return createErrorResponse(new Error("Invalid request: missing id"), 400, request);

    const prisma = getPrismaClient();
    const existing = await prisma.maintenanceContact.findFirst({ where: { id, userId } });
    if (!existing) {
      return createErrorResponse(new ResourceNotFoundError("Contact"), 404, request);
    }

    await prisma.maintenanceContact.delete({ where: { id } });

    // Kept as a bare `{ success: true }` rather than the `{ data }` envelope: this is an
    // authorization fix, and no caller should have to change shape because of it.
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error as Error, 500, request);
  }
}
