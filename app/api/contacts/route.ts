import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { isMockMode } from "@/lib/config/data-mode";
import { contactService } from "@/lib/services/database/database.mock";

// GET /api/contacts - List all maintenance contacts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // In mock mode, use mock contact service
    if (isMockMode) {
      const contacts = await contactService.getAll('mock-user', type || undefined);
      return NextResponse.json({ data: contacts });
    }

    // Keep the where clause flexible for Prisma typings in different environments
    const whereClause: any = {};
    if (type) whereClause.type = type;

    const prisma = getPrismaClient();
    const contacts = await prisma.maintenanceContact.findMany({
      where: whereClause,
      orderBy: [{ name: "asc" } as any],
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

    // In mock mode, reject write operations
    if (isMockMode) {
      return NextResponse.json(
        { error: 'Write operations not supported in mock mode' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Normalize/validate incoming values conservatively to avoid NaN/shape issues
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
        name: data.name,
        company: data.company || null,
        type: data.type || "contractor",
        specialties,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        hourlyRate: Number.isNaN(hourlyRate) ? null : hourlyRate,
        currency: data.currency || "EUR",
        rating: Number.isNaN(rating) ? null : rating,
        notes: data.notes || null,
      } as any,
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
