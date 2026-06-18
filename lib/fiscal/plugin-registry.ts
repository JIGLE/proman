import type { FiscalPlugin } from "./plugin-interface";
import { ptPlugin } from "./pt-plugin";
import { esPlugin } from "./es-plugin";
import { itPlugin } from "./it-plugin";

const plugins: Map<string, FiscalPlugin> = new Map([
  ["PT", ptPlugin],
  ["ES", esPlugin],
  ["IT", itPlugin],
]);

/** Return the plugin for a country code, or null if unsupported. */
export function getPlugin(countryCode: string): FiscalPlugin | null {
  return plugins.get(countryCode.toUpperCase()) ?? null;
}

/** List all registered country codes. */
export function listCountries(): string[] {
  return Array.from(plugins.keys());
}

/** Register a new plugin (used by future country expansions). */
export function registerPlugin(plugin: FiscalPlugin): void {
  plugins.set(plugin.countryCode.toUpperCase(), plugin);
}
