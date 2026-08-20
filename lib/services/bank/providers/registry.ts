import type { BankDataProvider } from "./types";

/**
 * Provider key → bank data provider.
 *
 * Mirrors `lib/tax/connectors/registry.ts`, and exists for the same reason: so no domain service
 * names a specific vendor. `sync.ts` and the API routes resolve through here, so adding a provider
 * is a registration rather than a rewrite.
 *
 * `BankConnection.provider` stores `psd2_<key>` — the prefix distinguishes a live provider
 * connection from the `manual` and `csv` rows the import pipeline find-or-creates, which matters
 * because those two must never be offered a sync button or counted as a live feed.
 *
 * **This map is deliberately empty.** The one adapter that shipped here spoke to GoCardless Bank
 * Account Data, which stopped accepting new signups in July 2025 — so it could only ever work for
 * an instance that already held credentials, and no new operator could obtain any. Shipping an
 * adapter nobody can use is worse than shipping none: it puts a connect button in the UI whose
 * only possible outcome is failure. CSV import is the working path until an adapter lands here.
 *
 * Everything downstream of this map — consent, sync, the budget, the encrypted IBAN at rest — is
 * provider-agnostic and covered by tests that use a fake provider rather than a vendor.
 */
const PROVIDERS: Record<string, BankDataProvider> = {};

/** Prefix marking a connection as belonging to a real provider rather than manual/CSV import. */
export const PSD2_PREFIX = "psd2_";

/** `BankConnection.provider` value for a provider key. */
export function providerColumnValue(key: string): string {
  return `${PSD2_PREFIX}${key}`;
}

/** The provider key inside a `BankConnection.provider`, or null for manual/CSV rows. */
export function providerKeyFromColumn(column: string): string | null {
  return column.startsWith(PSD2_PREFIX) ? column.slice(PSD2_PREFIX.length) : null;
}

/** The provider for a key, or undefined when none is registered. */
export function getBankProvider(key: string | null | undefined): BankDataProvider | undefined {
  if (!key) return undefined;
  return PROVIDERS[key.trim().toLowerCase()];
}

/** The provider for a `BankConnection.provider` column value. Manual/CSV rows resolve to undefined. */
export function getProviderForConnection(column: string): BankDataProvider | undefined {
  return getBankProvider(providerKeyFromColumn(column));
}

/**
 * Provider keys this instance has credentials for.
 *
 * Registration and configuration are different questions: an instance with no secrets must not be
 * offered a connect button that can only fail. The UI asks this, not `Object.keys(PROVIDERS)`.
 *
 * Each provider answers for itself. This used to read
 * `key === "<one vendor>" ? isThatVendorConfigured() : false`, which meant any second adapter was
 * hardcoded to unconfigured — registered, resolvable, fully credentialled, and silently never
 * offered, with nothing anywhere reporting why.
 */
export function configuredProviders(): string[] {
  return Object.values(PROVIDERS)
    .filter((provider) => provider.isConfigured())
    .map((provider) => provider.key)
    .sort();
}

/** Registered providers, configured or not — for diagnostics that must not lie by omission. */
export function registeredProviders(): BankDataProvider[] {
  return Object.values(PROVIDERS);
}

/** Exported for tests: register a provider for the duration of a case. */
export function __registerProviderForTest(provider: BankDataProvider): () => void {
  PROVIDERS[provider.key] = provider;
  return () => {
    delete PROVIDERS[provider.key];
  };
}
