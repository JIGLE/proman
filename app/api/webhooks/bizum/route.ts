// Bizum Webhook Handler — Spain
// Receives Bizum payment status callbacks from the bank-consortium gateway and
// reconciles them against the originating transaction.
import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payment/payment-service";
import {
  isBizumConfigured,
  normalizeBizumWebhook,
  type BizumWebhookPayload,
} from "@/lib/payment/providers/bizum-client";
import { getSecret } from "@/lib/utils/env";
import { rateLimit, RateLimits } from "@/lib/middleware/rate-limit";

/**
 * POST /api/webhooks/bizum — Handle Bizum payment notifications.
 *
 * The gateway authenticates callbacks with a shared signature header. When
 * BIZUM_WEBHOOK_SECRET is configured the header must match; otherwise the
 * endpoint returns 404 to indicate the integration is disabled.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isBizumConfigured()) {
    return NextResponse.json({ error: "Bizum integration disabled" }, { status: 404 });
  }

  const rateLimitResponse = await rateLimit(request, RateLimits.WEBHOOK);
  if (rateLimitResponse) return rateLimitResponse as NextResponse;

  const webhookSecret = getSecret("BIZUM_WEBHOOK_SECRET");
  if (webhookSecret) {
    const signature = request.headers.get("x-webhook-signature");
    if (signature !== webhookSecret) {
      console.warn("[Bizum webhook] Invalid or missing signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as BizumWebhookPayload;
    const event = normalizeBizumWebhook(payload);

    const result = await paymentService.processProviderWebhook(event);

    return NextResponse.json(
      { received: true, processed: result.success, transactionId: result.transactionId },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Bizum webhook] Unexpected error:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
