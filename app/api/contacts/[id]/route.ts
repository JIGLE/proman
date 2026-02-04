import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

// GET /api/contacts/[id] - Get a single maintenance contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { id } = await params;

    const prisma = getPrismaClient();
    const contact = await prisma.maintenanceContact.findUnique({
      where: { id },
      include: {
        assignedTickets: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ data: contact });
  } catch (error) {
    console.error("Failed to get contact:", error);
    return NextResponse.json(
      { error: "Failed to load contact" },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id] - Update a maintenance contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const data = await request.json();

    const prisma = getPrismaClient();
    const contact = await prisma.maintenanceContact.update({
      where: { id },
      data: {
        name: data.name,
        company: data.company || null,
        type: data.type,
        specialties: data.specialties || [],
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
        currency: data.currency || "EUR",
        rating: data.rating ? parseFloat(data.rating) : null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json({ data: contact });
  } catch (error) {
    console.error("Failed to update contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] - Delete a maintenance contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { id } = await params;

    const prisma = getPrismaClient();
    await prisma.maintenanceContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
