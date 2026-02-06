#!/usr/bin/env node

function log(...args) {
  console.debug('[check-hostport]', ...args);
}

const host = process.env.HOSTNAME;
const port = process.env.PORT;

// If PRESTART_CHECK_HOSTPORT is explicitly set to 'true', enforce presence and validity.
const enforce = process.env.PRESTART_CHECK_HOSTPORT === 'true';

if (!host || !port) {
  if (enforce) {
    console.error('[check-hostport] Missing required environment variable(s): HOSTNAME and/or PORT');
    process.exit(1);
  }
  console.warn('[check-hostport] HOSTNAME and/or PORT not set; skipping strict check. Set PRESTART_CHECK_HOSTPORT=true to enforce.');
  // Non-fatal: allow caller to continue
  process.exit(0);
}

const portNum = Number(port);
if (!Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) {
  if (enforce) {
    console.error('[check-hostport] Invalid PORT value:', port);
    process.exit(1);
  }
  console.warn('[check-hostport] Invalid PORT value, but PRESTART_CHECK_HOSTPORT not enabled:', port);
  process.exit(0);
}

log('HOSTNAME and PORT present:', host, port);
process.exit(0);
