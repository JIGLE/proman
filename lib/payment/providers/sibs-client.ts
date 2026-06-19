/**
 * SIBS API client foundation for MB WAY (Portugal).
 *
 * MB WAY is not available through Stripe; it is operated by SIBS via the SIBS
 * Payment Gateway (SPG). This module provides a thin, typed client that:
 *   - reports whether SIBS credentials are configured,
 *   - issues an MB WAY charge against the SIBS sandbox/live endpoint,
 *   - normalizes inbound webhook payloads into a provider-agnostic shape.
 *
 * It deliberately does NOT implement the full payment lifecycle. When
 * credentials are absent every call returns a typed "not configured" result so
 * the UI can surface a clear message instead of throwing.
 *
 * Docs: https://www.sibs.com/en/documentation/
 */

import { getSecret } from "@/lib/utils/env";
import type { TransactionStatus } from "@prisma/client";

export interface SibsConfig {
  apiUrl: string;
  apiKey: string;
  clientId: string;
  /** SPG terminal id (a.k.a. terminalId) */
  terminalId: string;
  entityId: string;
}

export interface SibsMbwayChargeRequest {
  /** Portuguese mobile, 9 digits starting with 9 (no country code) */
  phoneNumber: string;
  /** Amount in cents */
  amount: number;
  /** ISO currency, defaults to EUR */
  currency?: string;
  description?: string;
  /** Our internal transaction id, echoed back on the webhook */
  merchantTransactionId?: string;
}

export interface SibsMbwayChargeResult {
  success: boolean;
  /** SIBS transaction id, persisted as providerTransactionId */
  requestId?: string;
  /** Raw SIBS status code, e.g. "PENDING", "SUCCESS", "DECLINED" */
  providerStatus?: string;
  /** Mapped lifecycle status */
  status?: TransactionStatus;
  error?: string;
  /** True when the failure is purely a missing-config issue (not a hard error) */
  notConfigured?: boolean;
}

/**
 * Shape of the JSON SIBS POSTs to our webhook endpoint when an MB WAY
 * payment changes state. Only the fields we consume are typed.
 */
export interface SibsWebhookPayload {
  transactionID?: string;
  merchantTransactionId?: string;
  paymentStatus?: string; // "Success" | "Declined" | "Pending" | "Expired" ...
  amount?: { value?: number; currency?: string };
}

export interface NormalizedProviderEvent {
  provider: "mbway" | "bizum";
  providerTransactionId?: string;
  merchantTransactionId?: string;
  status: TransactionStatus;
  rawStatus?: string;
}

/** Read SIBS configuration from env / mounted secrets. */
export function getSibsConfig(): SibsConfig | null {
  const apiKey = getSecret("SIBS_API_KEY");
  const clientId = getSecret("SIBS_CLIENT_ID");
  const terminalId = getSecret("SIBS_TERMINAL_ID");
  const entityId = getSecret("SIBS_ENTITY");
  if (!apiKey || !clientId || !terminalId || !entityId) return null;
  return {
    apiUrl: getSecret("SIBS_API_URL") || "https://spg.qly.site1.sibs.pt/api/v2",
    apiKey,
    clientId,
    terminalId,
    entityId,
  };
}

export function isSibsConfigured(): boolean {
  return getSibsConfig() !== null;
}

/** Map a raw SIBS status string to our TransactionStatus lifecycle. */
export function mapSibsStatus(raw: string | undefined): TransactionStatus {
  switch ((raw || "").toLowerCase()) {
    case "success":
    case "succeeded":
    case "captured":
      return "succeeded";
    case "declined":
    case "error":
    case "rejected":
      return "failed";
    case "expired":
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "pending":
    case "processing":
    default:
      return "requires_action";
  }
}

/** Normalize a SIBS webhook payload into a provider-agnostic event. */
export function normalizeSibsWebhook(payload: SibsWebhookPayload): NormalizedProviderEvent {
  return {
    provider: "mbway",
    providerTransactionId: payload.transactionID,
    merchantTransactionId: payload.merchantTransactionId,
    status: mapSibsStatus(payload.paymentStatus),
    rawStatus: payload.paymentStatus,
  };
}

/**
 * Initiate an MB WAY charge through the SIBS SPG.
 *
 * Returns a typed result rather than throwing. When SIBS is not configured the
 * result has `notConfigured: true` so callers can fall back gracefully.
 */
export async function createSibsMbwayCharge(
  request: SibsMbwayChargeRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<SibsMbwayChargeResult> {
  const config = getSibsConfig();
  if (!config) {
    return {
      success: false,
      notConfigured: true,
      error: "SIBS API credentials not configured.",
    };
  }

  const body = {
    merchant: { terminalId: config.terminalId, entity: config.entityId },
    transaction: {
      transactionTimestamp: new Date().toISOString(),
      description: request.description || "Rent payment via MB WAY",
      moto: false,
      paymentType: "PURS",
      amount: {
        value: request.amount / 100,
        currency: request.currency || "EUR",
      },
      paymentMethod: ["MBWAY"],
    },
    customer: { phoneNumber: `351#${request.phoneNumber}` },
    merchantTransactionId: request.merchantTransactionId,
  };

  try {
    const res = await fetchImpl(`${config.apiUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-IBM-Client-Id": config.clientId,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      transactionID?: string;
      paymentStatus?: string;
      returnStatus?: { statusMsg?: string };
    };

    if (!res.ok) {
      return {
        success: false,
        providerStatus: json.paymentStatus,
        error: json.returnStatus?.statusMsg || `SIBS request failed (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      requestId: json.transactionID,
      providerStatus: json.paymentStatus,
      status: mapSibsStatus(json.paymentStatus),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SIBS request failed";
    return { success: false, error: message };
  }
}
