import { describe, it, expect } from "vitest";
import en from "./en.json";
import pt from "./pt.json";
import es from "./es.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type JsonObject = { [key: string]: unknown };

/**
 * Recursively collect every leaf-node key path in a nested object.
 * e.g. { a: { b: "x" } } → ["a.b"]
 */
function getLeafPaths(obj: JsonObject, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return getLeafPaths(value as JsonObject, path);
    }
    return [path];
  });
}

/**
 * Resolve a dot-separated path inside a nested object.
 * Returns undefined if any segment is missing.
 */
function resolvePath(obj: JsonObject, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((curr, segment) => {
    if (curr !== null && typeof curr === "object") {
      return (curr as JsonObject)[segment];
    }
    return undefined;
  }, obj);
}

// ---------------------------------------------------------------------------
// Derived data — en is the canonical baseline
// ---------------------------------------------------------------------------

const enPaths = getLeafPaths(en as JsonObject);

const locales: Array<{ name: string; data: JsonObject }> = [
  { name: "pt", data: pt as JsonObject },
  { name: "es", data: es as JsonObject },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("i18n locale completeness", () => {
  it("en.json has at least one key (sanity check)", () => {
    expect(enPaths.length).toBeGreaterThan(0);
  });

  for (const { name, data } of locales) {
    describe(`${name}.json`, () => {
      it("contains every key present in en.json", () => {
        const missing = enPaths.filter((path) => resolvePath(data, path) === undefined);

        if (missing.length > 0) {
          const formatted = missing.map((p) => `  • ${p}`).join("\n");
          expect.fail(`${name}.json is missing ${missing.length} key(s):\n${formatted}`);
        }

        expect(missing).toHaveLength(0);
      });

      it("has no keys that are missing from en.json (no orphaned translations)", () => {
        const localePaths = getLeafPaths(data);
        const orphaned = localePaths.filter(
          (path) => resolvePath(en as JsonObject, path) === undefined,
        );

        if (orphaned.length > 0) {
          const formatted = orphaned.map((p) => `  • ${p}`).join("\n");
          expect.fail(
            `${name}.json has ${orphaned.length} key(s) not present in en.json:\n${formatted}`,
          );
        }

        expect(orphaned).toHaveLength(0);
      });
    });
  }
});
