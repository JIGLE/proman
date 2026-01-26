#!/usr/bin/env node
const { spawnSync } = require('child_process');
const args = ['require("fs")|better-sqlite3|node_modules/.prisma', '.next'];
const r = spawnSync('rg', args, { stdio: 'pipe' });
if (r.status === 0) {
  console.error('Native/server modules found in .next');
  process.exit(1);
} else {
  console.debug('OK: no native refs in .next');
}
