/**
 * API Route: POST /api/compliance/rent-cap
 * Validate a proposed rent against Ley de Vivienda caps
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { logAudit } from "@/lib/services/audit-log";
import { TaxCalculator } from "@/lib/services/tax-calculator";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const body = await request.json();
  const {
    proposedMonthlyRent,
    priorContractRent,
    mitmaReferenceIndex,
    isNewContract,
    isZonaTensionada,
    totalUnitsOwned,
    unitsInStressedZones,
  } = body;

  if (typeof proposedMonthlyRent !== "number" || proposedMonthlyRent <= 0) {
    await logAudit({
      userId,
      action: "VALIDATE_RENT_CAP",
      resourceType: "RentCapValidation",
      details: { success: false, reason: "invalid_proposed_monthly_rent", proposedMonthlyRent },
    });
    return NextResponse.json(
      { error: "proposedMonthlyRent must be a positive number" },
      { status: 400 },
    );
  }

  const isGranTenedor = TaxCalculator.isGrandesTenedores(
    totalUnitsOwned ?? 0,
    unitsInStressedZones ?? 0,
  );

  const result = TaxCalculator.validateRentCap({
    proposedMonthlyRent,
    priorContractRent,
    mitmaReferenceIndex,
    isNewContract: isNewContract ?? false,
    isZonaTensionada: isZonaTensionada ?? false,
    isGranTenedor,
  });

  await logAudit({
    userId,
    action: "VALIDATE_RENT_CAP",
    resourceType: "RentCapValidation",
    details: {
      success: true,
      proposedMonthlyRent,
      priorContractRent,
      mitmaReferenceIndex,
      isNewContract: isNewContract ?? false,
      isZonaTensionada: isZonaTensionada ?? false,
      isGranTenedor,
      result,
    },
  });

  return NextResponse.json({
    ...result,
    isGranTenedor,
    proposedMonthlyRent,
  });
}
