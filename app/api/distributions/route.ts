import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { 
  calculateDistribution, 
  saveDistribution,
  getDistributionHistory,
  DistributionInput
} from "@/lib/services/income-distribution";

// GET /api/distributions - Get distribution history
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const year = searchParams.get("year");

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    const distributions = await getDistributionHistory(
      propertyId,
      year ? parseInt(year) : undefined
    );

    return NextResponse.json({ data: distributions });
  } catch (error) {
    console.error("Failed to get distributions:", error);
    return NextResponse.json(
      { error: "Failed to load distributions" },
      { status: 500 }
    );
  }
}

// POST /api/distributions - Calculate and save a new distribution
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;

    const { userId } = authResult;

    const data = await request.json();

    // Validate required fields
    if (!data.propertyId || !data.periodStart || !data.periodEnd) {
      return NextResponse.json(
        { error: "propertyId, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }

    if (!data.owners || data.owners.length === 0) {
      return NextResponse.json(
        { error: "At least one owner is required" },
        { status: 400 }
      );
    }

    const input: DistributionInput = {
      propertyId: data.propertyId,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      totalIncome: parseFloat(data.totalIncome) || 0,
      totalExpenses: parseFloat(data.totalExpenses) || 0,
      owners: data.owners.map((o: { 
        ownerId: string; 
        ownerName: string; 
        percentage: number; 
        taxCountry?: string 
      }) => ({
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        percentage: parseFloat(String(o.percentage)),
        taxCountry: o.taxCountry || "Portugal",
      })),
      taxMode: data.taxMode || "pre-tax",
      calculatedByUserId: userId,
    };

    // Calculate the distribution
    const result = calculateDistribution(input);

    // Save if requested
    if (data.save !== false) {
      const saved = await saveDistribution(result);
      return NextResponse.json({ data: saved }, { status: 201 });
    }

    // Return preview without saving
    return NextResponse.json({ data: result, preview: true });
  } catch (error) {
    console.error("Failed to calculate distribution:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate distribution" },
      { status: 500 }
    );
  }
}
