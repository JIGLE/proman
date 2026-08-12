#!/usr/bin/env node
/**
 * Pin third-party GitHub Actions to commit SHAs.
 *
 * A tag like `@v4` is a mutable pointer the upstream owner can move at any time, at which
 * point every workflow here starts running different code with the same reference. A commit
 * SHA cannot be moved. This rewrites third-party `uses:` lines to
 *
 *     uses: owner/repo@<40-char-sha> # v4
 *
 * keeping the human-readable version in a trailing comment. Dependabot understands this
 * format and keeps bumping both parts (see .github/dependabot.yml).
 *
 * Actions owned by `actions/` and `github/` are deliberately left on tags: they are
 * first-party to the platform the workflow already trusts completely, and pinning them adds
 * churn without moving the threat model.
 *
 * WHY THIS IS A SCRIPT AND NOT ALREADY APPLIED: resolving a tag to a SHA needs the GitHub
 * API for repositories outside this one, which the sandbox this was written in cannot reach
 * (403 from the agent proxy). Guessing SHAs would be worse than leaving tags — a wrong pin
 * either breaks every workflow or, silently, pins nothing. So the resolution runs where the
 * network is.
 *
 * Usage:
 *   node scripts/pin-actions.mjs            # rewrite in place
 *   node scripts/pin-actions.mjs --check    # exit 1 if anything is unpinned (CI-friendly)
 *
 * Auth is optional but recommended — unauthenticated API calls are rate-limited to 60/hour:
 *   GITHUB_TOKEN=$(gh auth token) node scripts/pin-actions.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const FIRST_PARTY = ["actions/", "github/"];
const USES_RE = /^(\s*(?:-\s*)?uses:\s*)([\w.-]+\/[\w.-]+)@([^\s#]+)(\s*#.*)?$/;

const checkOnly = process.argv.includes("--check");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const isSha = (ref) => /^[0-9a-f]{40}$/.test(ref);
const isFirstParty = (repo) => FIRST_PARTY.some((prefix) => repo.startsWith(prefix));

const cache = new Map();

async function resolveSha(repo, tag) {
  const key = `${repo}@${tag}`;
  if (cache.has(key)) return cache.get(key);

  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${repo}/git/ref/tags/${tag}`, { headers });
  if (!res.ok) {
    throw new Error(`${key}: GitHub API returned ${res.status} ${res.statusText}`);
  }
  const body = await res.json();

  // An annotated tag points at a tag object, not the commit — dereference it, because the
  // tag object's SHA is not what `uses:` resolves against.
  let sha = body.object?.sha;
  if (body.object?.type === "tag") {
    const tagRes = await fetch(`https://api.github.com/repos/${repo}/git/tags/${sha}`, { headers });
    if (!tagRes.ok) throw new Error(`${key}: could not dereference annotated tag`);
    sha = (await tagRes.json()).object?.sha;
  }

  if (!isSha(sha)) throw new Error(`${key}: resolved to '${sha}', which is not a commit SHA`);
  cache.set(key, sha);
  return sha;
}

const files = [];
for await (const f of glob(".github/workflows/*.yml")) files.push(f);
for await (const f of glob(".github/actions/*/action.yml")) files.push(f);
files.sort();

let unpinned = 0;
let rewritten = 0;
const failures = [];

for (const file of files) {
  const original = await readFile(file, "utf8");
  const lines = original.split("\n");
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const m = USES_RE.exec(lines[i]);
    if (!m) continue;

    const [, prefix, repo, ref, comment = ""] = m;

    // Local composite actions (`./.github/actions/...`) never match the repo pattern, and
    // Docker-based `uses: docker://...` has no owner/repo shape either — both fall out here.
    if (isFirstParty(repo) || isSha(ref)) continue;

    unpinned++;
    if (checkOnly) {
      console.log(`unpinned  ${file}:${i + 1}  ${repo}@${ref}`);
      continue;
    }

    try {
      const sha = await resolveSha(repo, ref);
      // Preserve any existing trailing comment that is not our own version marker.
      const extra = comment.trim().replace(/^#\s*/, "");
      const note = extra && extra !== ref ? `${ref} (${extra})` : ref;
      lines[i] = `${prefix}${repo}@${sha} # ${note}`;
      console.log(`pinned    ${file}:${i + 1}  ${repo}@${ref} -> ${sha.slice(0, 12)}…`);
      changed = true;
      rewritten++;
    } catch (err) {
      failures.push(`${file}:${i + 1}  ${err.message}`);
    }
  }

  if (changed) await writeFile(file, lines.join("\n"));
}

if (failures.length) {
  console.error("\nCould not resolve:");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

if (checkOnly) {
  if (unpinned) {
    console.error(`\n${unpinned} third-party action(s) still pinned to a mutable tag.`);
    console.error("Run: GITHUB_TOKEN=$(gh auth token) node scripts/pin-actions.mjs");
    process.exit(1);
  }
  console.log("All third-party actions are pinned to commit SHAs.");
} else {
  console.log(`\n${rewritten} reference(s) pinned.`);
}
