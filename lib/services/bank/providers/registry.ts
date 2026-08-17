import type { BankDataProvider } from "./types";
import { goCardlessProvider, isGoCardlessConfigured } from "./gocardless";

/**
 * Provider key → bank data provider.
 *
 * Mirrors `lib/tax/connectors/registry.ts`, and exists for the same reason: so no domain service
 * names a specific vendor. `sync.ts` and the API routes resolve through here, so a second provider
 * is a registration rather than a rewrite.
 *
 * `BankConnection.provider` stores `psd2_<key>` — the prefix distinguishes a live provider
 * connection from the `manual` and `csv` rows the import pipeline find-or-creates, which matters
 * because those two must never be offered a sync button or counted as a live feed.
 */
const PROVIDERS: Record<string, BankDataProvider> = {
  gocardless: goCardlessProvider,
};

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
 * Registration and configuration are different questions: the code ships with GoCardless
 * registered, but a self-hosted instance with no secrets must not be offered a connect button
 * that can only fail. The UI asks this, not `Object.keys(PROVIDERS)`.
 */
export function configuredProviders(): string[] {
  return Object.keys(PROVIDERS)
    .filter((key) => (key === "gocardless" ? isGoCardlessConfigured() : false))
    .sort();
}
