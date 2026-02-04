import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

// GET /api/contacts - List all maintenance contacts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const whereClause: { type?: string } = {};
    if (type) {
      whereClause.type = type;
    }

    const prisma = getPrismaClient();
    const contacts = await prisma.maintenanceContact.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error("Failed to get contacts:", error);
    return NextResponse.json(
      { error: "Failed to load contacts" },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a new maintenance contact
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const data = await request.json();

    const prisma = getPrismaClient();
    const contact = await prisma.maintenanceContact.create({
      data: {
        name: data.name,
        company: data.company || null,
        type: data.type || "contractor",
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

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
