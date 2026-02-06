#!/usr/bin/env node
/**
 * Prestart orchestrator: runs optional prestart checks conditionally.
 * - SKIP_PRESTART=true  -> skip all checks
 * - PRESTART_CHECK_HOSTPORT=true -> enforce host/port validation
 * - If DATABASE_URL indicates sqlite (file:) then run ensure-sqlite, otherwise skip sqlite ensure step
 */

const path = require('path');
const fs = require('fs');

if (process.env.SKIP_PRESTART === 'true') {
  console.log('[prestart] SKIP_PRESTART=true; skipping prestart checks.');
  process.exit(0);
}

// Optionally run host/port check (will be non-fatal unless PRESTART_CHECK_HOSTPORT=true)
try {
  require('./check-hostport');
} catch (err) {
  console.warn('[prestart] check-hostport failed:', err && err.message);
}

// Only run sqlite ensure when DATABASE_URL suggests sqlite
const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl.startsWith('file:')) {
  try {
    require('./ensure-sqlite');
  } catch (err) {
    console.error('[prestart] ensure-sqlite failed:', err && err.message);
    // If ensure-sqlite fails, preserve exit to avoid starting with invalid DB only if forced by env
    if (process.env.PRESTART_FAIL_ON_SQLITE === 'true') {
      process.exit(1);
    }
  }
} else {
  console.log('[prestart] DATABASE_URL does not indicate sqlite; skipping sqlite ensure step.');
}

process.exit(0);
