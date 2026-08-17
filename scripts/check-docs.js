#!/usr/bin/env node
/**
 * Documentation hygiene gate.
 *
 * Three assertions, each of which has already been violated in this repo:
 *
 *   1. LINKS — every relative link in every tracked `.md` resolves. 48 were broken before this
 *      existed. This is also what makes deleting a doc safe: the deletion fails loudly instead of
 *      leaving dangling references behind.
 *
 *   2. ORPHANS — every file under `docs/` is reachable from `docs/README.md`, the root `README.md`
 *      or `CLAUDE.md`. 24 were reachable from nothing. Three of those documented live code, so the
 *      lesson is not "delete unreferenced files" — it is "index them, and notice when you can't".
 *
 *   3. RETIRED CLAIMS — sentences known to be false stay deleted. `V1_CHECKLIST` said "No live
 *      bank connection exists" for one merge after it stopped being true, because a claim about
 *      what exists has an expiry and nothing was watching it.
 *
 * WHY IT FAILS WHEN IT CANNOT RUN. A checker that finds no files and exits 0 is the repo's
 * signature bug — the green-but-inert job, four instances of it so far. If the index is missing or
 * the scan finds nothing, that is a failure, not a pass.
 *
 * Link resolution deliberately allows two forms: relative to the document, and relative to the
 * repo root. Several docs cite code as `lib/services/…` or `proxy.ts`, meaning "from the root",
 * which is a reasonable convention and not worth 17 rewrites to satisfy a checker.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const INDEX = "docs/README.md";

/** Files under docs/ that need no index entry, with the reason they are exempt. */
const INDEX_EXEMPT = new Set([
  "docs/README.md", // it is the index
]);

/**
 * Sentences that were true once and are now false. Add a line here in the same commit that makes
 * one false — that is the moment someone is already looking at the relevant code.
 */
const RETIRED_CLAIMS = [
  {
    pattern: /No live bank connection exists/i,
    retired: "2026-08-17 (PR #334)",
    because:
      "PSD2 account information shipped; /admin derives bank status from the connection rows",
  },
  {
    pattern: /claude\/situs-design-polish-6zpz2f/,
    retired: "2026-08-17",
    because: "that branch has never existed; the real one is claude/proman-design-polish-6zpz2f",
  },
];

/** Lines allowed to mention a retired claim, because they are the record of its retirement. */
const CLAIM_ALLOWLIST = [
  /previously read/i,
  /never existed/i,
  /Do not "correct"/i,
  /RETIRED_CLAIMS/, // this file
  /retired:/,
];

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;
const EXTERNAL = /^(https?:|mailto:|tel:|data:|#)/;

function tracked() {
  const out = execFileSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function exists(p) {
  try {
    fs.statSync(path.join(ROOT, p));
    return true;
  } catch {
    return false;
  }
}

const failures = [];

// ---------------------------------------------------------------- preconditions

const files = tracked();
if (files.length === 0) {
  console.error("✖ No tracked .md files found. The scan cannot have run correctly.");
  process.exit(1);
}
if (!exists(INDEX)) {
  console.error(`✖ ${INDEX} is missing. It is the index every doc must be reachable from.`);
  process.exit(1);
}

// ---------------------------------------------------------------- 1. links

let linksChecked = 0;
for (const file of files) {
  const dir = path.dirname(file);
  const text = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const m of text.matchAll(LINK)) {
    const target = m[1].split("#")[0].trim();
    if (!target || EXTERNAL.test(target)) continue;
    linksChecked += 1;
    const fromDoc = path.normalize(path.join(dir, target));
    const fromRoot = path.normalize(target.replace(/^\.\//, ""));
    if (exists(fromDoc) || exists(fromRoot)) continue;
    failures.push(`${file}: link does not resolve → ${target}`);
  }
}
if (linksChecked === 0) {
  console.error("✖ Zero links checked across every doc. The link scan is not working.");
  process.exit(1);
}

// ---------------------------------------------------------------- 2. orphans

const indexText =
  fs.readFileSync(path.join(ROOT, INDEX), "utf8") +
  (exists("README.md") ? fs.readFileSync(path.join(ROOT, "README.md"), "utf8") : "") +
  (exists("CLAUDE.md") ? fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8") : "");

const docsFiles = files.filter((f) => f.startsWith("docs/"));
if (docsFiles.length === 0) {
  console.error("✖ No files found under docs/. The orphan scan is not working.");
  process.exit(1);
}
for (const file of docsFiles) {
  if (INDEX_EXEMPT.has(file)) continue;
  const relToDocs = file.slice("docs/".length);
  if (indexText.includes(relToDocs) || indexText.includes(file)) continue;
  failures.push(`${file}: not reachable from ${INDEX} — add the link in this commit`);
}

// ---------------------------------------------------------------- 3. retired claims

for (const file of files) {
  const lines = fs.readFileSync(path.join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const claim of RETIRED_CLAIMS) {
      if (!claim.pattern.test(line)) continue;
      if (CLAIM_ALLOWLIST.some((ok) => ok.test(line))) continue;
      failures.push(
        `${file}:${i + 1}: retired claim (${claim.retired}) — ${claim.because}\n      ${line.trim()}`,
      );
    }
  });
}

// ---------------------------------------------------------------- report

console.log("\nDocumentation hygiene\n");
console.log(`  ${files.length} tracked .md files`);
console.log(`  ${linksChecked} relative links checked`);
console.log(`  ${docsFiles.length} files under docs/, ${INDEX_EXEMPT.size} exempt from the index`);
console.log(`  ${RETIRED_CLAIMS.length} retired claims watched\n`);

if (failures.length > 0) {
  console.error(`✖ ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`   ${f}`);
  console.error("");
  process.exit(1);
}

console.log("  All clear.\n");
process.exit(0);
