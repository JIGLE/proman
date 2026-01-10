#!/usr/bin/env node
const fs = require('fs');

function log(...args) {
  console.log('[check-hostport]', ...args);
}

const host = process.env.HOSTNAME;
const port = process.env.PORT;

if (!host) {
  console.error('[check-hostport] Missing required environment variable: HOSTNAME');
  process.exit(1);
}

if (!port) {
  console.error('[check-hostport] Missing required environment variable: PORT');
  process.exit(1);
}

const portNum = Number(port);
if (!Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) {
  console.error('[check-hostport] Invalid PORT value:', port);
  process.exit(1);
}

log('HOSTNAME and PORT present:', host, port);
process.exit(0);
