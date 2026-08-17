import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

/**
 * A container that cannot create its database must not start.
 *
 * `CMD` is `npm run prestart && node server.js`. When `ensure-sqlite.js` exits 0 the server comes
 * up regardless, and because `/api/ready` answers 200 without touching the database, the Docker
 * healthcheck goes green — so the orchestrator reports the app HEALTHY while every data route
 * 500s. Sign-in still works (NextAuth uses JWT sessions), which makes it read as a partial
 * outage rather than a missing database.
 *
 * That is not hypothetical. On a real deployment the host path mounted at /app/data was owned by
 * root with mode 755 while the container runs as uid 1001, so the file could never be created;
 * the app reported healthy and served 500s for a day before anyone read the container log.
 *
 * The exit code is the whole contract here, so that is what this asserts.
 */

const SCRIPT = join(process.cwd(), "scripts", "ensure-sqlite.js");

/**
 * A DATABASE_URL whose parent is a FILE, not a directory.
 *
 * The obvious way to make the write fail is an unwritable directory — but these tests run as
 * root, where mode 000 is no obstacle at all, and the test would pass by never failing. ENOTDIR
 * is refused for every uid including root, so the failure is real regardless of who runs it.
 */
const UNCREATABLE = `file:${join("/etc/hostname", "situs.sqlite")}`;

function runPrestart(env: Record<string, string>) {
  return spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, DATABASE_URL: UNCREATABLE, ...env },
    encoding: "utf8",
  });
}

describe("prestart, when the database file cannot be created", () => {
  it("refuses to start in production", () => {
    const result = runPrestart({ NODE_ENV: "production" });

    expect(result.status).toBe(1);
    expect(`${result.stderr}${result.stdout}`).toContain("/etc/hostname");
  });

  it("names uid 1001 and the chown that fixes it", () => {
    // The failure this defends against was a permissions problem on a mounted host directory.
    // An errno alone sent nobody to the right place; the remedy has to be in the message.
    const output = `${runPrestart({ NODE_ENV: "production" }).stderr}`;

    expect(output).toContain("1001:1001");
    expect(output).toContain("chown -R 1001:1001");
  });

  it("still allows an operator to override the refusal", () => {
    // The escape hatch has to keep working, or the only way out of a bad mount is a new image.
    const result = runPrestart({
      NODE_ENV: "production",
      PRESTART_FAIL_ON_SQLITE: "false",
    });

    expect(result.status).toBe(0);
  });

  it("does not fail development, where a missing database is routine", () => {
    const result = runPrestart({ NODE_ENV: "development" });

    expect(result.status).toBe(0);
  });
});
