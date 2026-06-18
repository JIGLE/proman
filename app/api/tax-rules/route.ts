import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";

const ruleSchema = z.object({
  country: z.string().length(2).toUpperCase(),
  regime: z.string().min(1).max(64),
  ruleType: z.enum(["INCOME_BRACKET", "DEDUCTIBLE_RATE", "WITHHOLDING_RATE", "FLAT_RATE"]),
  year: z.number().int().min(2020).max(2040),
  effectiveDate: z.string().datetime(),
  payload: z.string().min(2), // must be valid JSON string
  sourceUrl: z.string().url().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// GET /api/tax-rules — list all rules, optional ?country= and ?year= filters
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;

  try {
    const prisma = getPrismaClient();
    const rules = await prisma.taxRule.findMany({
      where: {
        ...(country ? { country } : {}),
        ...(year ? { year } : {}),
      },
      orderBy: [{ country: "asc" }, { year: "desc" }, { regime: "asc" }],
    });
    return NextResponse.json({ data: rules });
  } catch (err) {
    console.error("tax-rules GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tax-rules — create a new rule
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();
    const parsed = ruleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Validate JSON payload is parseable
    try {
      JSON.parse(parsed.data.payload);
    } catch {
      return NextResponse.json({ error: "payload must be valid JSON" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const rule = await prisma.taxRule.create({
      data: {
        ...parsed.data,
        effectiveDate: new Date(parsed.data.effectiveDate),
        sourceUrl: parsed.data.sourceUrl ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A rule with this country/regime/ruleType/year already exists" },
        { status: 409 },
      );
    }
    console.error("tax-rules POST error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
