import crypto from "crypto";

/**
 * Resolve the client IP for rate-limiting buckets.
 *
 * `X-Forwarded-For` is a list that each proxy APPENDS to, so the leftmost entry is whatever the
 * original caller sent — fully attacker-controlled. Both rate limiters used to read that entry,
 * which meant a brute-force attempt could rotate `X-Forwarded-For: <random>` per request and land
 * in a fresh bucket every time. Every limit in the app was bypassable with one header.
 *
 * The trustworthy entry is counted from the RIGHT: the last value was appended by the proxy
 * closest to the app, so with one reverse proxy in front the rightmost entry is the real peer.
 * `TRUSTED_PROXY_COUNT` says how many proxies sit in front (default 1 — this app is deployed
 * behind an ingress or reverse proxy); with N proxies, the client is N entries from the right.
 *
 * Set TRUSTED_PROXY_COUNT=0 if the app is exposed directly, and the header is ignored entirely.
 */
export function resolveClientIp(request: Request): string {
  const trustedProxies = Number.parseInt(process.env.TRUSTED_PROXY_COUNT ?? "1", 10);
  const hops = Number.isFinite(trustedProxies) && trustedProxies >= 0 ? trustedProxies : 1;

  if (hops > 0) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const chain = forwarded
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      // Index from the right: 1 proxy => last entry, 2 => second-to-last, and so on. Clamped so a
      // short (or spoofed-short) chain cannot walk past the start into attacker-supplied values.
      const index = chain.length - hops;
      if (index >= 0 && chain[index]) return chain[index];
      if (chain.length > 0) return chain[0];
    }

    // Set by a single proxy rather than appended to, so it is as trustworthy as the hop count.
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp.trim();
  }

  // No trusted source of a client address. One shared bucket is deliberate: it degrades to a
  // global limit rather than handing every request its own private allowance.
  return "unknown";
}

/**
 * Compare two secrets using constant-time semantics to reduce timing side channels.
 */
export function timingSafeEqualString(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
