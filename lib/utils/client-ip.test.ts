import { afterEach, describe, expect, it } from "vitest";

import { resolveClientIp } from "./security";

/**
 * Rate limiting is only as good as the bucket key. Both limiters read the LEFTMOST
 * `X-Forwarded-For` entry, which is whatever the caller sent — so any attempt to brute force
 * anything could rotate that header per request and never share a bucket with itself. Every limit
 * in the app was one header away from being bypassed.
 *
 * X-Forwarded-For is appended to by each proxy, so the trustworthy entry is counted from the
 * right. These pin that, and that a spoofed prefix cannot shift the answer.
 */

const withHeaders = (headers: Record<string, string>) =>
  new Request("https://situs.example/api/whatever", { headers });

afterEach(() => {
  delete process.env.TRUSTED_PROXY_COUNT;
});

describe("resolveClientIp", () => {
  it("takes the entry appended by the nearest proxy, not the caller's", () => {
    // The attacker sent "1.1.1.1"; the reverse proxy appended the real peer after it.
    const ip = resolveClientIp(withHeaders({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" }));

    expect(ip).toBe("203.0.113.9");
  });

  it("gives a spoofing caller the same bucket no matter what they prepend", () => {
    const first = resolveClientIp(withHeaders({ "x-forwarded-for": "10.0.0.1, 203.0.113.9" }));
    const second = resolveClientIp(
      withHeaders({ "x-forwarded-for": "somethingelse, 203.0.113.9" }),
    );
    const third = resolveClientIp(withHeaders({ "x-forwarded-for": "a, b, c, 203.0.113.9" }));

    // The whole point: rotating the client-controlled prefix must not mint a fresh bucket.
    expect(new Set([first, second, third]).size).toBe(1);
    expect(first).toBe("203.0.113.9");
  });

  it("counts further left when more proxies are declared", () => {
    process.env.TRUSTED_PROXY_COUNT = "2";

    const ip = resolveClientIp(
      withHeaders({ "x-forwarded-for": "1.1.1.1, 203.0.113.9, 10.0.0.5" }),
    );

    expect(ip).toBe("203.0.113.9");
  });

  it("ignores the header entirely when no proxy is trusted", () => {
    process.env.TRUSTED_PROXY_COUNT = "0";

    const ip = resolveClientIp(withHeaders({ "x-forwarded-for": "1.1.1.1" }));

    // Degrades to one shared bucket rather than a private allowance per forged header.
    expect(ip).toBe("unknown");
  });

  it("does not walk past the start of a short chain into caller-supplied values", () => {
    process.env.TRUSTED_PROXY_COUNT = "3";

    const ip = resolveClientIp(withHeaders({ "x-forwarded-for": "1.1.1.1" }));

    expect(ip).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip, which a proxy sets rather than appends", () => {
    expect(resolveClientIp(withHeaders({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("returns a single shared bucket when no address is available", () => {
    expect(resolveClientIp(withHeaders({}))).toBe("unknown");
  });
});
