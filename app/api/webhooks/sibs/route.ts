// SIBS (MB WAY) Webhook Handler — Portugal
// Receives MB WAY payment status callbacks from the SIBS Payment Gateway and
// reconciles them against the originating transaction.
import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payment/payment-service";
import {
  isSibsConfigured,
  normalizeSibsWebhook,
  type SibsWebhookPayload,
} from "@/lib/payment/providers/sibs-client";
import { getSecret } from "@/lib/utils/env";
import { rateLimit, RateLimits } from "@/lib/middleware/rate-limit";

/**
 * POST /api/webhooks/sibs — Handle SIBS MB WAY payment notifications.
 *
 * SIBS authenticates callbacks with a shared signature header. When
 * SIBS_WEBHOOK_SECRET is configured the header must match; otherwise the
 * endpoint returns 404 to indicate the integration is disabled.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSibsConfigured()) {
    return NextResponse.json({ error: "SIBS integration disabled" }, { status: 404 });
  }

  const rateLimitResponse = await rateLimit(request, RateLimits.WEBHOOK);
  if (rateLimitResponse) return rateLimitResponse as NextResponse;

  // Verify the shared webhook signature when configured.
  const webhookSecret = getSecret("SIBS_WEBHOOK_SECRET");
  if (webhookSecret) {
    const signature = request.headers.get("x-webhook-signature");
    if (signature !== webhookSecret) {
      console.warn("[SIBS webhook] Invalid or missing signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as SibsWebhookPayload;
    const event = normalizeSibsWebhook(payload);

    const result = await paymentService.processProviderWebhook(event);

    // Always acknowledge receipt (200) so SIBS does not retry indefinitely.
    return NextResponse.json(
      { received: true, processed: result.success, transactionId: result.transactionId },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[SIBS webhook] Unexpected error:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
