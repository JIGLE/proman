/**
 * API Route: SEPA Direct Debit Mandate Lifecycle
 *
 * GET    — List mandates for a tenant
 * POST   — Create new SEPA DD mandate
 * DELETE — Cancel/revoke a SEPA DD mandate
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/services/auth/auth-middleware";
import { getPrismaClient } from "@/lib/services/database/database";
import { paymentService } from "@/lib/payment";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const mandates = await prisma.paymentMethod.findMany({
    where: {
      tenantId,
      type: "sepa_debit",
      isActive: true,
    },
    select: {
      id: true,
      type: true,
      provider: true,
      ibanLast4: true,
      accountHolder: true,
      country: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ mandates });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { tenantId, iban, accountHolderName, country } = body;

  if (!tenantId || !iban || !accountHolderName) {
    return NextResponse.json(
      { error: "tenantId, iban, and accountHolderName are required" },
      { status: 400 },
    );
  }

  // Validate IBAN format based on country
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();
  const countryCode = country || cleanIban.substring(0, 2);

  if (countryCode === "PT" && !/^PT\d{23}$/.test(cleanIban)) {
    return NextResponse.json(
      { error: "Invalid Portuguese IBAN (must be PT + 23 digits)" },
      { status: 400 },
    );
  }
  if (countryCode === "ES" && !/^ES\d{22}$/.test(cleanIban)) {
    return NextResponse.json(
      { error: "Invalid Spanish IBAN (must be ES + 22 digits)" },
      { status: 400 },
    );
  }

  if (!paymentService.isReady()) {
    return NextResponse.json(
      { error: "Payment service not configured" },
      { status: 503 },
    );
  }

  const prisma = getPrismaClient();

  try {
    const stripe = paymentService.getStripeClient();
    const customerId = await paymentService.getOrCreateStripeCustomer(tenantId);

    // Create SetupIntent for SEPA DD (triggers SCA if required by bank)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["sepa_debit"],
      metadata: { tenantId, country: countryCode },
    });

    // Mask and store
    const maskedIban = `${cleanIban.slice(0, 4)}${"*".repeat(cleanIban.length - 8)}${cleanIban.slice(-4)}`;

    await prisma.paymentMethod.create({
      data: {
        tenantId,
        type: "sepa_debit",
        provider: "stripe",
        stripeCustomerId: customerId,
        country: countryCode,
        iban: maskedIban,
        ibanLast4: cleanIban.slice(-4),
        accountHolder: accountHolderName,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create SEPA mandate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const mandateId = url.searchParams.get("id");

  if (!mandateId) {
    return NextResponse.json(
      { error: "Mandate id is required" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();

  const mandate = await prisma.paymentMethod.findUnique({
    where: { id: mandateId },
  });

  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
  }

  // Deactivate mandate (soft delete — preserves transaction history)
  await prisma.paymentMethod.update({
    where: { id: mandateId },
    data: { isActive: false },
  });

  // If Stripe mandate exists, cancel SetupIntent / detach payment method
  if (mandate.stripePaymentMethodId && paymentService.isReady()) {
    try {
      const stripe = paymentService.getStripeClient();
      await stripe.paymentMethods.detach(mandate.stripePaymentMethodId);
    } catch {
      // Non-fatal: mandate is already deactivated locally
    }
  }

  return NextResponse.json({ success: true, mandateId });
}
