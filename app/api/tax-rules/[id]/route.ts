import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

const updateSchema = z.object({
  effectiveDate: z.string().datetime().optional(),
  payload: z.string().min(2).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// GET /api/tax-rules/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  try {
    const prisma = getPrismaClient();
    const rule = await prisma.taxRule.findUnique({ where: { id } });
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: rule });
  } catch (err) {
    console.error("tax-rules GET[id] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/tax-rules/[id] — update payload / notes / sourceUrl / effectiveDate
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.payload) {
      try {
        JSON.parse(parsed.data.payload);
      } catch {
        return NextResponse.json({ error: "payload must be valid JSON" }, { status: 400 });
      }
    }

    const prisma = getPrismaClient();
    const rule = await prisma.taxRule.update({
      where: { id },
      data: {
        ...(parsed.data.effectiveDate
          ? { effectiveDate: new Date(parsed.data.effectiveDate) }
          : {}),
        ...(parsed.data.payload !== undefined ? { payload: parsed.data.payload } : {}),
        ...(parsed.data.sourceUrl !== undefined ? { sourceUrl: parsed.data.sourceUrl } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
    });
    return NextResponse.json({ data: rule });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("tax-rules PUT error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/tax-rules/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;

  try {
    const prisma = getPrismaClient();
    await prisma.taxRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("tax-rules DELETE error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
