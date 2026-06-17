#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

const includeDirs = ['app', 'components', 'lib', 'pages', 'src'];
const excludeNames = new Set(['.next', 'node_modules', 'public', 'docs', 'tests', 'release-charts', 'helm', '.git']);
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const findings = [];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (excludeNames.has(e.name)) continue;
      await walk(p);
    } else if (e.isFile()) {
      if (!exts.has(path.extname(e.name))) continue;
      let content;
      try {
        content = await fs.readFile(p, 'utf8');
      } catch {
        continue;
      }
      const lines = content.split(/\r?\n/);
      // Skip the currency symbol definition file (it contains intentional mappings)
      if (/\/lib\/currency\.(ts|js)$/.test(p.replace(/\\/g, '/'))) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Conservative patterns: $ followed by digit (e.g. $100), quoted "$" + var, or standalone "$" string
        if (/\$[0-9]/.test(line) || /"\$"\s*\+/.test(line) || /'\$'\s*\+/.test(line) || /"\$"/.test(line) || /'\$'/.test(line)) {
          findings.push({ file: p, line: i + 1, text: line.trim() });
        }
      }
    }
  }
}

async function main() {
  const cwd = process.cwd();
  for (const dir of includeDirs) {
    await walk(path.join(cwd, dir));
  }

  if (findings.length === 0) {
    console.log('No currency literal "$" matches found in source directories.');
    process.exit(0);
  }

  console.log('Currency literal matches found:');
  for (const f of findings) {
    console.log(`${f.file}:${f.line}: ${f.text}`);
  }
  // exit non-zero to make CI checks explicit if any are found
  process.exit(1);
}

main().catch((err) => {
  console.error('Error running currency-literal check:', err);
  process.exit(2);
});
