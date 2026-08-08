#!/usr/bin/env node
/**
 * List the user-facing English strings still hardcoded in a component.
 *
 * A wiring aid for the i18n backlog, not a gate: it reports candidates so a human decides
 * which are load-bearing copy and which are ids, class names or debug text. Pairs with the
 * DOM-side check — next-intl renders the key path on a miss, so the only way to prove a view
 * is fully wired is to walk it in every locale and scan for rendered key paths.
 *
 * Usage: node scripts/i18n-extract.mjs <file.tsx>
 */
"use strict";

import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/i18n-extract.mjs <file.tsx>");
  process.exit(2);
}

const lines = fs.readFileSync(file, "utf8").split("\n");
const hits = [];

// Attributes whose value reaches the screen or the accessibility tree.
const VISIBLE_ATTR =
  /(placeholder|title|label|aria-label|confirmLabel|cancelLabel|actionLabel|description|emptyMessage|emptyText|tooltip)=(?:"([^"]{2,})"|\{"([^"]{2,})"\})/g;
// Object-literal fields that end up rendered (filter options, column defs, dialog config).
const VISIBLE_PROP =
  /\b(label|title|description|confirmLabel|cancelLabel|actionLabel|header|heading|name)\s*:\s*"([^"]{2,})"/g;
// Toast and confirm calls.
const CALL = /\b(success|error|info|warning|toast)\(\s*[`"']([^`"']{3,})/g;

lines.forEach((line, i) => {
  const n = i + 1;
  const t = line.trim();

  for (const m of line.matchAll(/>\s*([A-Z][A-Za-z0-9'’,.:%/&()\-! ]{2,})\s*</g))
    hits.push([n, "text", m[1].trim()]);
  for (const m of line.matchAll(VISIBLE_ATTR)) hits.push([n, m[1], m[2] ?? m[3]]);
  for (const m of line.matchAll(VISIBLE_PROP)) hits.push([n, m[1], m[2]]);
  for (const m of line.matchAll(CALL)) hits.push([n, "call", m[2]]);

  // A bare line of prose inside JSX (text nodes wrap across lines).
  if (
    /^[A-Z][A-Za-z0-9 ,.'’:%()&/!-]{3,}$/.test(t) &&
    !t.includes("=") &&
    !t.endsWith(",") &&
    !/^(const|return|import|export|type|interface|function|class|await|if|else)\b/.test(t)
  ) {
    hits.push([n, "prose", t]);
  }
});

const seen = new Set();
for (const [n, kind, text] of hits) {
  const key = `${kind}|${text}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`${String(n).padStart(5)}  ${kind.padEnd(12)}  ${text}`);
}
console.error(`\n${seen.size} unique candidate strings in ${file}`);
