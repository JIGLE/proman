import { configuredProviders, getBankProvider } from "@/lib/services/bank/providers/registry";
import type { ProviderDiagnostics } from "@/lib/services/bank/providers/types";

/**
 * The operator-facing self-check for bank data providers.
 *
 * Every setup failure this instance has produced so far surfaced as the same empty bank picker:
 * a missing key, a key that does not match the application id, an application not yet approved
 * for production, and a redirect URL that was never registered. Only the last of those even
 * announces itself, and only after the operator has been sent to a bank and bounced back.
 *
 * So this asks the provider what it knows about its own registration and reports it verbatim.
 * It grants nothing, spends no consent, and writes nothing.
 */

export interface ProviderCheckRow extends ProviderDiagnostics {
  key: string;
  displayName: string;
  /** False when the adapter offers no self-check; the UI says so rather than showing "unknown". */
  supportsDiagnostics: boolean;
  /** Set only when the check itself broke, as distinct from the provider reporting a problem. */
  checkFailed: string | null;
}

export interface BankProviderCheck {
  /** The callback this instance sends, derived from NEXTAUTH_URL. Null when that is unset. */
  expectedRedirectUrl: string | null;
  providers: ProviderCheckRow[];
  checkedAt: string;
}

/**
 * Derived here rather than imported from `consent.ts`, whose `callbackUrl()` throws when
 * NEXTAUTH_URL is absent. Throwing is right there — you cannot start a consent without it — and
 * wrong here, where "NEXTAUTH_URL is not set" is one of the answers this page exists to give.
 */
export function expectedCallbackUrl(): string | null {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/api/bank/connections/callback` : null;
}

function unconfiguredRow(key: string, displayName: string, redirect: string | null) {
  return {
    key,
    displayName,
    supportsDiagnostics: false,
    checkFailed: null,
    configured: false,
    authenticated: null,
    authError: null,
    applicationName: null,
    environment: null,
    redirectUrls: [],
    expectedRedirectUrl: redirect,
    redirectUrlRegistered: null,
    institutionsTotal: null,
    institutionsByCountry: [],
  } satisfies ProviderCheckRow;
}

export async function runBankProviderCheck(): Promise<BankProviderCheck> {
  const expectedRedirectUrl = expectedCallbackUrl();
  const keys = configuredProviders();

  const providers = await Promise.all(
    keys.map(async (key): Promise<ProviderCheckRow> => {
      const provider = getBankProvider(key);
      if (!provider) return unconfiguredRow(key, key, expectedRedirectUrl);

      if (!provider.diagnose) {
        return {
          ...unconfiguredRow(key, provider.displayName, expectedRedirectUrl),
          configured: provider.isConfigured(),
        };
      }

      try {
        return {
          key,
          displayName: provider.displayName,
          supportsDiagnostics: true,
          checkFailed: null,
          ...(await provider.diagnose(expectedRedirectUrl)),
          // The adapter reports the redirect it was handed; this is the instance's own answer and
          // must not be overwritten by a provider that left the field null.
          expectedRedirectUrl,
        };
      } catch (error) {
        // A provider reporting a configuration problem is a result, not an exception — so
        // reaching here means the check itself broke, which is a different thing and is labelled
        // as such. The message is not echoed: this renders in a browser.
        console.error(`Bank provider diagnostics failed for ${key}:`, error);
        return {
          ...unconfiguredRow(key, provider.displayName, expectedRedirectUrl),
          supportsDiagnostics: true,
          configured: provider.isConfigured(),
          checkFailed: "check_threw",
        };
      }
    }),
  );

  return { expectedRedirectUrl, providers, checkedAt: new Date().toISOString() };
}
