// Small polyfills / globals for the test environment
// - Provide globalThis.fetch if not present (vitest/node may not have it)
// - Provide TextEncoder/TextDecoder if missing

import { TextEncoder, TextDecoder } from 'util';

if (!(globalThis as any).fetch) {
  // lightweight node-fetch like shim using undici if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetch } = require('undici');
    (globalThis as any).fetch = fetch;
  } catch (e) {
    // leave undefined — tests that need fetch should mock it explicitly
  }
}

if (!(globalThis as any).TextEncoder) (globalThis as any).TextEncoder = TextEncoder;
if (!(globalThis as any).TextDecoder) (globalThis as any).TextDecoder = TextDecoder;
