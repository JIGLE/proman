import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/**
 * A standing guard against a client component reaching server-only code.
 *
 * This exists because the failure it catches shipped, undetected, across four commits.
 * `tsc --noEmit`, ESLint and Vitest all passed the whole time — none of them bundle for a
 * browser, so none of them can see the problem. Only `next build` failed, and `npm run verify`
 * does not build:
 *
 *   settings-integrations.tsx  ("use client")
 *     → lib/tax/connectors/presentation.ts
 *       → lib/tax/connectors/mode-guard.ts
 *         → lib/services/tax/connector-service.ts
 *           → lib/services/database/database.ts
 *             → @prisma/adapter-better-sqlite3 → better-sqlite3 → a native .node binary
 *
 * The import that caused it was deliberate and looked harmless: a client-side presentation
 * helper reading `SIMULATED_MODES` from the server-side guard so the two could not drift apart.
 * Good instinct, wrong module — the constant now lives in a leaf (`connectors/modes.ts`) with no
 * imports of its own.
 *
 * A build takes ~90 seconds in CI and is the last thing to run. This walk takes milliseconds and
 * runs with the unit tests, so the same mistake is caught before the slow job even starts —
 * which is the cheaper place to spend the time.
 */

const ROOT = process.cwd();
const SOURCE_DIRS = ["components", "app", "lib"];

/** Anything that pulls a database driver into a bundle. */
const SERVER_ONLY = [
  "@prisma/client",
  "@prisma/adapter-better-sqlite3",
  "better-sqlite3",
  "node:fs",
  "node:child_process",
];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const ALL_FILES = SOURCE_DIRS.flatMap((d) => walk(join(ROOT, d)));

/** Import specifiers in a file. Type-only imports are excluded — they are erased at compile. */
function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /(?:^|\n)\s*import\s+([\s\S]*?)from\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const clause = match[1];
    // `import type { X } from "y"` never reaches the bundle.
    if (/^\s*type\s/.test(clause)) continue;
    specifiers.push(match[2]);
  }
  return specifiers;
}

/** Resolve a local specifier to a file on disk, or null if it is a package. */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = join(ROOT, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return null;

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

const sourceCache = new Map<string, string>();
function read(file: string): string {
  let cached = sourceCache.get(file);
  if (cached === undefined) {
    cached = readFileSync(file, "utf8");
    sourceCache.set(file, cached);
  }
  return cached;
}

const isClientComponent = (file: string) => /^\s*["']use client["']/.test(read(file));

/**
 * Walk outward from a client component and return the first path that reaches a server-only
 * package, or null. Returns the whole chain because the offending import is rarely the one in
 * the component itself — it is three or four hops away.
 */
function findServerReach(entry: string): string[] | null {
  const seen = new Set<string>();
  const queue: { file: string; path: string[] }[] = [{ file: entry, path: [entry] }];

  while (queue.length > 0) {
    const { file, path } = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);

    for (const specifier of importsOf(read(file))) {
      const offending = SERVER_ONLY.find((s) => specifier === s || specifier.startsWith(`${s}/`));
      if (offending) return [...path, offending];

      const next = resolveLocal(specifier, file);
      // A "use server" boundary is fine — Next handles it. Only plain modules propagate.
      if (next && !seen.has(next)) queue.push({ file: next, path: [...path, next] });
    }
  }
  return null;
}

describe("client/server import boundary", () => {
  const clientFiles = ALL_FILES.filter(isClientComponent);

  it("finds client components to scan", () => {
    // Without this the whole file silently passes the moment the layout or the directive
    // changes — the green-but-inert shape this repo keeps producing.
    expect(clientFiles.length).toBeGreaterThan(20);
  });

  it("detects a reach when one exists", () => {
    // Proves the walk works, using a real server module as the entry point. If this stops
    // finding anything, the resolver is broken and the guard below is meaningless.
    const dbConsumer = join(ROOT, "lib", "services", "tax", "connector-service.ts");
    expect(existsSync(dbConsumer)).toBe(true);
    expect(findServerReach(dbConsumer)).not.toBeNull();
  });

  it("no client component reaches a database driver", () => {
    const violations = clientFiles
      .map((file) => ({ file, chain: findServerReach(file) }))
      .filter((v) => v.chain !== null)
      .map((v) => v.chain!.map((p) => p.replace(`${ROOT}/`, "")).join("\n    → "));

    expect(
      violations,
      `A "use client" file imports its way to a server-only package. The browser bundle cannot\n` +
        `contain a native database driver, so \`next build\` fails — but type-check, lint and the\n` +
        `unit suite all pass, which is how this went unnoticed for four commits.\n\n` +
        `Fix by moving the shared value into a leaf module with no imports (see\n` +
        `lib/tax/connectors/modes.ts), not by duplicating it.\n\n` +
        violations.join("\n\n"),
    ).toEqual([]);
  });
});
