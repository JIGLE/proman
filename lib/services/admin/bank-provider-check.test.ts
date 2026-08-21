import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { BankDataProvider, ProviderDiagnostics } from "@/lib/services/bank/providers/types";

/**
 * The self-check's contract, and the one assertion that earns its keep: an unregistered redirect
 * URL is reported as unregistered.
 *
 * That failure is the reason this exists. A missing key announces itself immediately and a
 * wrong-country picker is at least visible, but a callback the provider has never heard of stays
 * silent until the operator has already been sent to a bank and bounced back — at which point the
 * error they see belongs to the bank, not to us.
 *
 * The rest of the cases pin the shape: a configuration problem is a RESULT, and only a fault in
 * the check itself is an exception. A version of this that threw on a bad key would take the whole
 * panel down at exactly the moment it has something to say.
 */

const { registryMock } = vi.hoisted(() => ({
  registryMock: {
    configuredProviders: vi.fn<() => string[]>(),
    getBankProvider: vi.fn<(key: string) => BankDataProvider | null>(),
  },
}));

vi.mock("@/lib/services/bank/providers/registry", () => registryMock);

import { runBankProviderCheck, expectedCallbackUrl } from "./bank-provider-check";

const CALLBACK = "https://situs.example/api/bank/connections/callback";

function provider(overrides: Partial<BankDataProvider> = {}): BankDataProvider {
  return {
    key: "enablebanking",
    displayName: "Enable Banking",
    dailyReadBudget: 4,
    isConfigured: () => true,
    listInstitutions: vi.fn(),
    createConsentLink: vi.fn(),
    completeConsent: vi.fn(),
    fetchTransactions: vi.fn(),
    ...overrides,
  } as BankDataProvider;
}

function diagnostics(overrides: Partial<ProviderDiagnostics> = {}): ProviderDiagnostics {
  return {
    configured: true,
    authenticated: true,
    authError: null,
    applicationName: "Situs",
    environment: "sandbox",
    redirectUrls: [CALLBACK],
    expectedRedirectUrl: CALLBACK,
    redirectUrlRegistered: true,
    institutionsTotal: 3,
    institutionsByCountry: [{ country: "PT", count: 3 }],
    ...overrides,
  };
}

const originalUrl = process.env.NEXTAUTH_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = "https://situs.example";
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalUrl;
});

describe("expectedCallbackUrl", () => {
  it("derives the callback the instance will actually send", () => {
    expect(expectedCallbackUrl()).toBe(CALLBACK);
  });

  it("tolerates a trailing slash on NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://situs.example/";
    expect(expectedCallbackUrl()).toBe(CALLBACK);
  });

  it("returns null rather than throwing when NEXTAUTH_URL is unset", () => {
    // `consent.ts` throws here, correctly — you cannot start a consent without it. This page has
    // to keep working in order to TELL you that, so it answers instead of failing.
    delete process.env.NEXTAUTH_URL;
    expect(expectedCallbackUrl()).toBeNull();
  });
});

describe("runBankProviderCheck", () => {
  it("passes the instance's callback to the provider and reports a match", async () => {
    const diagnose = vi.fn(async () => diagnostics());
    registryMock.configuredProviders.mockReturnValue(["enablebanking"]);
    registryMock.getBankProvider.mockReturnValue(provider({ diagnose }));

    const result = await runBankProviderCheck();

    expect(diagnose).toHaveBeenCalledWith(CALLBACK);
    expect(result.providers[0].redirectUrlRegistered).toBe(true);
    expect(result.providers[0].supportsDiagnostics).toBe(true);
  });

  it("reports an unregistered redirect URL, with the URL that should have been there", async () => {
    // The silent failure. Everything else about this application is fine — key valid, banks
    // reachable — and a consent will still fail at the last step.
    registryMock.configuredProviders.mockReturnValue(["enablebanking"]);
    registryMock.getBankProvider.mockReturnValue(
      provider({
        diagnose: async () =>
          diagnostics({
            redirectUrls: ["https://situs.example/some/other/path"],
            redirectUrlRegistered: false,
            // A provider is free to leave this null — the contract only asks it to compare. The
            // instance's own answer must still reach the row, because the remedy renders it.
            expectedRedirectUrl: null,
          }),
      }),
    );

    const result = await runBankProviderCheck();

    expect(result.providers[0].authenticated).toBe(true);
    expect(result.providers[0].redirectUrlRegistered).toBe(false);
    // The remedy has to be renderable, so the expected URL must survive onto the row.
    expect(result.providers[0].expectedRedirectUrl).toBe(CALLBACK);
  });

  it("treats a refused key as a result, not an exception", async () => {
    registryMock.configuredProviders.mockReturnValue(["enablebanking"]);
    registryMock.getBankProvider.mockReturnValue(
      provider({
        diagnose: async () =>
          diagnostics({
            authenticated: false,
            authError: "http_401",
            applicationName: null,
            environment: null,
            redirectUrls: [],
            redirectUrlRegistered: null,
            institutionsTotal: null,
            institutionsByCountry: [],
          }),
      }),
    );

    const result = await runBankProviderCheck();

    expect(result.providers[0].authenticated).toBe(false);
    expect(result.providers[0].authError).toBe("http_401");
    expect(result.providers[0].checkFailed).toBeNull();
  });

  it("distinguishes a broken check from a provider reporting a problem", async () => {
    registryMock.configuredProviders.mockReturnValue(["enablebanking"]);
    registryMock.getBankProvider.mockReturnValue(
      provider({
        diagnose: async () => {
          throw new Error("boom");
        },
      }),
    );

    const result = await runBankProviderCheck();

    // The panel stays up and says which of the two happened; the two need opposite responses.
    expect(result.providers[0].checkFailed).toBe("check_threw");
    expect(result.providers[0].authenticated).toBeNull();
  });

  it("says a provider offers no self-check rather than reporting a false unknown", async () => {
    registryMock.configuredProviders.mockReturnValue(["legacy"]);
    registryMock.getBankProvider.mockReturnValue(
      provider({ key: "legacy", displayName: "Legacy", diagnose: undefined }),
    );

    const result = await runBankProviderCheck();

    expect(result.providers[0].supportsDiagnostics).toBe(false);
    expect(result.providers[0].configured).toBe(true);
  });

  it("returns an empty provider list when the instance has no bank credentials", async () => {
    // Not an error state, and the commonest one: CSV-import-only instances are the default.
    registryMock.configuredProviders.mockReturnValue([]);

    const result = await runBankProviderCheck();

    expect(result.providers).toEqual([]);
    expect(result.expectedRedirectUrl).toBe(CALLBACK);
  });
});
