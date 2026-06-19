import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Control which secrets are "configured" per test.
const secrets: Record<string, string | undefined> = {};
vi.mock("@/lib/utils/env", () => ({
  getSecret: vi.fn((key: string) => secrets[key]),
  isEnabled: vi.fn(() => false),
}));

import {
  isSibsConfigured,
  mapSibsStatus,
  normalizeSibsWebhook,
  createSibsMbwayCharge,
} from "./sibs-client";
import {
  isBizumConfigured,
  mapBizumStatus,
  normalizeBizumWebhook,
  createBizumCharge,
} from "./bizum-client";

beforeEach(() => {
  for (const k of Object.keys(secrets)) delete secrets[k];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SIBS MB WAY client", () => {
  it("reports not configured when credentials are missing", () => {
    expect(isSibsConfigured()).toBe(false);
  });

  it("reports configured when all four credentials are present", () => {
    secrets.SIBS_API_KEY = "k";
    secrets.SIBS_CLIENT_ID = "c";
    secrets.SIBS_TERMINAL_ID = "t";
    secrets.SIBS_ENTITY = "e";
    expect(isSibsConfigured()).toBe(true);
  });

  it("maps raw SIBS statuses to the lifecycle", () => {
    expect(mapSibsStatus("Success")).toBe("succeeded");
    expect(mapSibsStatus("Declined")).toBe("failed");
    expect(mapSibsStatus("Expired")).toBe("cancelled");
    expect(mapSibsStatus("Pending")).toBe("requires_action");
    expect(mapSibsStatus(undefined)).toBe("requires_action");
  });

  it("normalizes a webhook payload into a provider-agnostic event", () => {
    const event = normalizeSibsWebhook({
      transactionID: "sibs_123",
      merchantTransactionId: "txn_local",
      paymentStatus: "Success",
    });
    expect(event).toEqual({
      provider: "mbway",
      providerTransactionId: "sibs_123",
      merchantTransactionId: "txn_local",
      status: "succeeded",
      rawStatus: "Success",
    });
  });

  it("returns a typed notConfigured result without hitting the network", async () => {
    const fetchSpy = vi.fn();
    const result = await createSibsMbwayCharge(
      { phoneNumber: "912345678", amount: 5000 },
      fetchSpy as unknown as typeof fetch,
    );
    expect(result).toEqual({
      success: false,
      notConfigured: true,
      error: "SIBS API credentials not configured.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("issues a charge and maps the response when configured", async () => {
    secrets.SIBS_API_KEY = "k";
    secrets.SIBS_CLIENT_ID = "c";
    secrets.SIBS_TERMINAL_ID = "t";
    secrets.SIBS_ENTITY = "e";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transactionID: "sibs_999", paymentStatus: "Pending" }),
    });

    const result = await createSibsMbwayCharge(
      { phoneNumber: "912345678", amount: 5000, merchantTransactionId: "txn_1" },
      fetchSpy as unknown as typeof fetch,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.requestId).toBe("sibs_999");
    expect(result.status).toBe("requires_action");
  });
});

describe("Bizum client", () => {
  it("reports not configured when credentials are missing", () => {
    expect(isBizumConfigured()).toBe(false);
  });

  it("reports configured when key + merchant id are present", () => {
    secrets.BIZUM_API_KEY = "k";
    secrets.BIZUM_MERCHANT_ID = "m";
    expect(isBizumConfigured()).toBe(true);
  });

  it("maps raw Bizum statuses to the lifecycle", () => {
    expect(mapBizumStatus("AUTHORIZED")).toBe("succeeded");
    expect(mapBizumStatus("REFUSED")).toBe("failed");
    expect(mapBizumStatus("CANCELLED")).toBe("cancelled");
    expect(mapBizumStatus("PENDING")).toBe("requires_action");
  });

  it("normalizes a webhook payload into a provider-agnostic event", () => {
    const event = normalizeBizumWebhook({
      operationId: "op_1",
      order: "txn_local",
      status: "AUTHORIZED",
    });
    expect(event).toEqual({
      provider: "bizum",
      providerTransactionId: "op_1",
      merchantTransactionId: "txn_local",
      status: "succeeded",
      rawStatus: "AUTHORIZED",
    });
  });

  it("returns a typed notConfigured result without hitting the network", async () => {
    const fetchSpy = vi.fn();
    const result = await createBizumCharge(
      { phoneNumber: "612345678", amount: 5000 },
      fetchSpy as unknown as typeof fetch,
    );
    expect(result.notConfigured).toBe(true);
    expect(result.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
