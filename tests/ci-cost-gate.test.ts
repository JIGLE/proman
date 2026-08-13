import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// js-yaml, not `yaml`: it is already a dependency of this project, and a standing guard is
// not worth adding a package for.
import { load } from "js-yaml";

/**
 * Pins the one interlock that moved when `build` was taken off `verify`.
 *
 * `build` used to sit behind `verify`, which meant it waited out the unit suite (146s) before
 * starting its own 83s of work — so a build failure took ~229s to surface. It consumed nothing
 * from `verify`, so that dependency was a COST GATE, not a data dependency: it existed to stop a
 * PR with failing tests spending runner minutes on everything downstream.
 *
 * Removing it without moving the gate would have been a silent regression — every Playwright job
 * would start on a PR whose unit tests had already failed, and nobody would notice, because
 * spending money is not a failing check. The gate now lives on `smoke`, which is the single
 * choke point in front of all three browser jobs.
 *
 * This asserts the property rather than the wiring: whatever the graph looks like, no expensive
 * job may be reachable without `verify` having passed.
 */

interface Workflow {
  jobs: Record<string, { name?: string; needs?: string | string[] }>;
}

const workflow = load(
  readFileSync(join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8"),
) as Workflow;

const needsOf = (job: string): string[] => {
  const needs = workflow.jobs[job]?.needs ?? [];
  return typeof needs === "string" ? [needs] : needs;
};

/** Every job that must complete before `job` can start, transitively. */
function ancestors(job: string, seen = new Set<string>()): Set<string> {
  for (const parent of needsOf(job)) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    ancestors(parent, seen);
  }
  return seen;
}

/** The browser jobs. Each spends minutes booting the app and driving Chromium. */
const EXPENSIVE = ["e2e", "e2e-smoke", "mobile-audit"];

describe("ci.yml cost gate", () => {
  it("parses the workflow and finds the jobs it reasons about", () => {
    // Without this the file passes vacuously the moment a job is renamed — and the whole point
    // is that a silent change here costs money rather than failing a check.
    expect(Object.keys(workflow.jobs)).toEqual(
      expect.arrayContaining(["verify", "build", "smoke", ...EXPENSIVE]),
    );
  });

  it.each(EXPENSIVE)("%s cannot start until verify has passed", (job) => {
    expect(ancestors(job)).toContain("verify");
  });

  it("build does not wait for verify, so build failures surface early", () => {
    // The change this file exists to protect. `next build` catches what type-check, lint and
    // Vitest structurally cannot — none of them bundle for a browser — so it should not be the
    // last thing to run.
    expect(ancestors("build")).not.toContain("verify");
  });

  it("build and verify are both entry points, so they run concurrently", () => {
    expect(needsOf("build")).toEqual([]);
    expect(needsOf("verify")).toEqual([]);
  });

  it("keeps the job display names that branch protection matches by string", () => {
    // Required status checks are matched by NAME. Renaming one silently stops it being
    // required, which is a false green of exactly the kind this repo keeps producing.
    const names = Object.values(workflow.jobs)
      .map((j) => j.name)
      .filter(Boolean)
      .sort();
    expect(names).toEqual([
      "Build validation",
      "E2E Smoke (required on PR)",
      "E2E Tests (Playwright)",
      "Mobile Audit (390px responsive violations)",
      "Smoke test (start built app)",
    ]);
  });
});
