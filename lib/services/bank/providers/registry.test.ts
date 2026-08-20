import { describe, it, expect, afterEach } from "vitest";

import {
  __registerProviderForTest,
  configuredProviders,
  getBankProvider,
  getProviderForConnection,
  providerColumnValue,
  providerKeyFromColumn,
  registeredProviders,
} from "./registry";
import { createFakeProvider } from "./fake-provider";

const cleanups: (() => void)[] = [];
function register(provider: ReturnType<typeof createFakeProvider>) {
  cleanups.push(__registerProviderForTest(provider));
  return provider;
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

describe("the provider registry", () => {
  it("ships with no providers registered", () => {
    // The one adapter that shipped here spoke to a service that stopped accepting new signups,
    // so it could only ever work for an instance that already had credentials. An empty map is
    // the honest state, and the UI must render "no provider" rather than a button that fails.
    expect(registeredProviders()).toHaveLength(0);
    expect(configuredProviders()).toEqual([]);
  });

  it("offers any registered provider that reports itself configured", () => {
    // The regression this exists for: `configuredProviders` used to read
    // `key === "<one vendor>" ? isThatVendorConfigured() : false`, so a second adapter was
    // hardcoded to unconfigured. It could be registered, resolved and fully credentialled, and
    // still never appear — with nothing anywhere reporting why. Revert that ternary and this
    // assertion is what goes red.
    register(createFakeProvider({ key: "alpha", configured: true }));
    expect(configuredProviders()).toEqual(["alpha"]);
  });

  it("keeps an unconfigured provider registered but not offered", () => {
    // Registration and configuration are different questions: the adapter exists in the build,
    // this instance just has no secrets for it. `/admin` needs to tell those apart.
    register(createFakeProvider({ key: "beta", configured: false }));
    expect(registeredProviders().map((p) => p.key)).toEqual(["beta"]);
    expect(configuredProviders()).toEqual([]);
  });

  it("offers several providers at once, sorted", () => {
    register(createFakeProvider({ key: "zulu", configured: true }));
    register(createFakeProvider({ key: "alpha", configured: true }));
    register(createFakeProvider({ key: "mike", configured: false }));
    expect(configuredProviders()).toEqual(["alpha", "zulu"]);
  });

  it("resolves a connection's column back to its provider", () => {
    const provider = register(createFakeProvider({ key: "alpha" }));
    expect(providerColumnValue("alpha")).toBe("psd2_alpha");
    expect(providerKeyFromColumn("psd2_alpha")).toBe("alpha");
    expect(getProviderForConnection("psd2_alpha")).toBe(provider);
  });

  it("treats manual and CSV rows as having no provider", () => {
    // These two must never be offered a sync button or counted as a live feed.
    expect(providerKeyFromColumn("manual")).toBeNull();
    expect(providerKeyFromColumn("csv")).toBeNull();
    expect(getProviderForConnection("manual")).toBeUndefined();
    expect(getProviderForConnection("csv")).toBeUndefined();
  });

  it("resolves nothing for an unknown or empty key", () => {
    expect(getBankProvider("nope")).toBeUndefined();
    expect(getBankProvider(null)).toBeUndefined();
    expect(getBankProvider("")).toBeUndefined();
  });

  it("carries a read budget per provider rather than one global number", () => {
    // The budget is a commercial term of whichever provider is in use, not a property of open
    // banking. It was a module-level constant justified by one vendor's free tier.
    const thrifty = register(createFakeProvider({ key: "thrifty", dailyReadBudget: 1 }));
    const generous = register(createFakeProvider({ key: "generous", dailyReadBudget: 50 }));
    expect(thrifty.dailyReadBudget).toBe(1);
    expect(generous.dailyReadBudget).toBe(50);
  });
});
