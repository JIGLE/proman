import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPlugin, listCountries } from "@/lib/fiscal";

const calcSchema = z.object({
  grossIncome: z.number().nonnegative(),
  expenses: z.number().nonnegative().optional(),
  regime: z.string().min(1),
  year: z.number().int().min(2020).max(2040),
});

// GET /api/fiscal/[country] — plugin metadata + supported regimes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> },
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { country } = await params;
  const plugin = getPlugin(country);

  if (!plugin) {
    return NextResponse.json(
      {
        error: `No fiscal plugin for country "${country.toUpperCase()}". Available: ${listCountries().join(", ")}`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    countryCode: plugin.countryCode,
    countryName: plugin.countryName,
    fiscalIdLabel: plugin.fiscalIdLabel,
    supportedRegimes: plugin.supportedRegimes,
  });
}

// POST /api/fiscal/[country] — calculate rental tax
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> },
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { country } = await params;
  const plugin = getPlugin(country);

  if (!plugin) {
    return NextResponse.json(
      {
        error: `No fiscal plugin for country "${country.toUpperCase()}". Available: ${listCountries().join(", ")}`,
      },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsed = calcSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await plugin.calculateRentalTax(parsed.data);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("Fiscal calculation error", err);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
