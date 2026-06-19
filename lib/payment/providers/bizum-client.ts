/**
 * Bizum API client foundation (Spain).
 *
 * Bizum is Spain's bank-backed instant mobile payment scheme. It is reached
 * through a redsys/bank-consortium gateway rather than Stripe. This module
 * mirrors the SIBS client: it reports configuration state, issues a charge
 * against the gateway sandbox/live endpoint, and normalizes inbound webhooks.
 *
 * Full settlement/refund flows are intentionally out of scope. When
 * credentials are absent every call returns a typed "not configured" result.
 *
 * Reference: https://bizum.es/en/
 */

import { getSecret } from "@/lib/utils/env";
import type { TransactionStatus } from "@prisma/client";
import type { NormalizedProviderEvent } from "./sibs-client";

export interface BizumConfig {
  apiUrl: string;
  apiKey: string;
  merchantId: string;
  /** Redsys/gateway terminal number */
  terminal: string;
}

export interface BizumChargeRequest {
  /** Spanish mobile, 9 digits starting with 6 or 7 */
  phoneNumber: string;
  /** Amount in cents */
  amount: number;
  currency?: string;
  description?: string;
  /** Our internal transaction id, echoed back on the webhook */
  merchantTransactionId?: string;
}

export interface BizumChargeResult {
  success: boolean;
  requestId?: string;
  providerStatus?: string;
  status?: TransactionStatus;
  error?: string;
  notConfigured?: boolean;
}

/** Subset of the gateway's Bizum webhook payload we consume. */
export interface BizumWebhookPayload {
  operationId?: string;
  order?: string; // echoes merchantTransactionId
  status?: string; // "AUTHORIZED" | "REFUSED" | "PENDING" | "CANCELLED"
  amount?: number;
  currency?: string;
}

/** Read Bizum gateway configuration from env / mounted secrets. */
export function getBizumConfig(): BizumConfig | null {
  const apiKey = getSecret("BIZUM_API_KEY");
  const merchantId = getSecret("BIZUM_MERCHANT_ID");
  if (!apiKey || !merchantId) return null;
  return {
    apiUrl: getSecret("BIZUM_API_URL") || "https://sis-t.redsys.es:25443/sis/rest",
    apiKey,
    merchantId,
    terminal: getSecret("BIZUM_TERMINAL") || "1",
  };
}

export function isBizumConfigured(): boolean {
  return getBizumConfig() !== null;
}

/** Map a raw Bizum/redsys status to our TransactionStatus lifecycle. */
export function mapBizumStatus(raw: string | undefined): TransactionStatus {
  switch ((raw || "").toLowerCase()) {
    case "authorized":
    case "success":
    case "settled":
      return "succeeded";
    case "refused":
    case "denied":
    case "error":
      return "failed";
    case "cancelled":
    case "canceled":
    case "expired":
      return "cancelled";
    case "pending":
    case "processing":
    default:
      return "requires_action";
  }
}

/** Normalize a Bizum webhook payload into a provider-agnostic event. */
export function normalizeBizumWebhook(payload: BizumWebhookPayload): NormalizedProviderEvent {
  return {
    provider: "bizum",
    providerTransactionId: payload.operationId,
    merchantTransactionId: payload.order,
    status: mapBizumStatus(payload.status),
    rawStatus: payload.status,
  };
}

/**
 * Initiate a Bizum charge through the gateway. Returns a typed result rather
 * than throwing; `notConfigured: true` signals a missing-credentials fallback.
 */
export async function createBizumCharge(
  request: BizumChargeRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<BizumChargeResult> {
  const config = getBizumConfig();
  if (!config) {
    return {
      success: false,
      notConfigured: true,
      error: "Bizum gateway credentials not configured.",
    };
  }

  const body = {
    merchantId: config.merchantId,
    terminal: config.terminal,
    order: request.merchantTransactionId,
    amount: request.amount,
    currency: request.currency || "EUR",
    paymentMethod: "z", // redsys code for Bizum
    customerPhone: request.phoneNumber,
    description: request.description || "Rent payment via Bizum",
  };

  try {
    const res = await fetchImpl(`${config.apiUrl}/bizum/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      operationId?: string;
      status?: string;
      errorMessage?: string;
    };

    if (!res.ok) {
      return {
        success: false,
        providerStatus: json.status,
        error: json.errorMessage || `Bizum request failed (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      requestId: json.operationId,
      providerStatus: json.status,
      status: mapBizumStatus(json.status),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bizum request failed";
    return { success: false, error: message };
  }
}
