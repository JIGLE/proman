#!/usr/bin/env node
/**
 * Advisory design-token audit.
 *
 * Flags hardcoded Tailwind color literals (e.g. `bg-red-500`, `text-green-400`)
 * in components/ that should instead use the semantic design tokens defined in
 * app/globals.css (`var(--color-*)` via `bg-[var(--color-success)]`, the Badge
 * `success|warning|destructive|info` variants, etc.).
 *
 * This is intentionally NON-BLOCKING: it prints a report and always exits 0, so
 * it never breaks CI on the existing backlog. Use it to ratchet the count down
 * over time. Run with `--strict` to fail when the count exceeds BASELINE.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["components", "app"];
const COLOR_FAMILIES =
  "red|green|blue|amber|yellow|purple|violet|indigo|emerald|rose|orange|pink|fuchsia|sky|cyan|teal|lime";
const UTILITY = "bg|text|border|ring|from|to|via|fill|stroke|shadow|divide|outline|decoration";
const PATTERN = new RegExp(`\\b(?:${UTILITY})-(?:${COLOR_FAMILIES})-[0-9]{2,3}\\b`, "g");

// Files where multi-color literals are intentional (illustrations, dev tooling).
const ALLOWLIST = [
  "empty-state-illustrations",
  "scenario-runner",
  "opengraph-image",
  "/charts/",
  // Marketing landing page — intentionally brand-tinted, not token-driven.
  path.join("app", "[locale]", "page.tsx"),
];

/** Baseline count at the time the ratchet was introduced. Lower this as you migrate. */
const BASELINE = 639;

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const strict = process.argv.includes("--strict");
const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d), []));

let total = 0;
const perFile = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (ALLOWLIST.some((a) => rel.includes(a))) continue;
  const matches = fs.readFileSync(file, "utf8").match(PATTERN);
  if (matches && matches.length) {
    total += matches.length;
    perFile.push({ rel, count: matches.length });
  }
}

perFile.sort((a, b) => b.count - a.count);

console.log("\nDesign-token audit — hardcoded Tailwind color literals\n");
for (const { rel, count } of perFile.slice(0, 20)) {
  console.log(`  ${String(count).padStart(4)}  ${rel}`);
}
if (perFile.length > 20) console.log(`  …and ${perFile.length - 20} more files`);
console.log(
  `\n  Total: ${total} occurrences across ${perFile.length} files (baseline ${BASELINE}).`,
);
console.log("  Prefer var(--color-*) tokens or the Badge/Button semantic variants.\n");

if (strict && total > BASELINE) {
  console.error(`✖ Color-literal count ${total} exceeds baseline ${BASELINE}. Migrate to tokens.`);
  process.exit(1);
}
process.exit(0);
