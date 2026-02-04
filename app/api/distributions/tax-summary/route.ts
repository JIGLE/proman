import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { 
  getAnnualTaxSummary,
  generatePortugalTaxForm,
  generateSpainTaxForm,
} from "@/lib/services/income-distribution";

// GET /api/distributions/tax-summary - Get annual tax summary for an owner
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");
    const year = searchParams.get("year");
    const country = searchParams.get("country");

    if (!ownerId) {
      return NextResponse.json(
        { error: "ownerId is required" },
        { status: 400 }
      );
    }

    const taxYear = year ? parseInt(year) : new Date().getFullYear() - 1;
    const summary = await getAnnualTaxSummary(ownerId, taxYear);

    // Generate tax form data if country specified
    let taxForm = null;
    if (country === "Portugal" || country === "PT") {
      taxForm = generatePortugalTaxForm(summary);
    } else if (country === "Spain" || country === "ES") {
      taxForm = generateSpainTaxForm(summary);
    }

    return NextResponse.json({ 
      data: summary,
      taxForm,
    });
  } catch (error) {
    console.error("Failed to get tax summary:", error);
    return NextResponse.json(
      { error: "Failed to load tax summary" },
      { status: 500 }
    );
  }
}
