import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, readFileSync as read } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { load } from "js-yaml";

/**
 * Only a tag push may claim `:latest` or a bare version number.
 *
 * This rule is not theoretical. `deploy-ghcr.yml` records the incident that produced it:
 * `ghcr.io/jigle/situs:1.24.0` was once built from commit `43997fd` while the git tag `v1.24.0`
 * pointed somewhere else, and `:latest` moved onto unreleased code at the same time. A version
 * number that does not mean the source it was cut from is worse than no version number, because
 * it is trusted.
 *
 * Adding the `main` development channel is exactly the change that could bring that back — one
 * stray `,:latest` in the wrong branch and every production pull silently follows an untested
 * merge. So this runs the workflow's ACTUAL tag-decision script under each ref and asserts what
 * comes out, rather than grepping the file for a string. A text match would pass on a script that
 * had been restructured into being wrong.
 */

interface Workflow {
  jobs: Record<string, { steps?: { id?: string; run?: string }[] }>;
}

const WORKFLOW = join(process.cwd(), ".github", "workflows", "deploy-ghcr.yml");

/** The `Set variables` step's shell script, with GitHub expressions resolved for local execution. */
function decisionScript(inputVersion: string): string {
  const workflow = load(readFileSync(WORKFLOW, "utf8")) as Workflow;
  const step = workflow.jobs.deploy.steps?.find((s) => s.id === "vars");
  if (!step?.run) throw new Error("deploy-ghcr.yml: no step with id 'vars' — has it been renamed?");

  return (
    step.run
      // `${{ … }}` is evaluated by Actions, not bash. Substitute the two that matter and blank
      // the rest, so the branching logic itself is what runs.
      .replace(/\$\{\{\s*github\.repository\s*\}\}/g, "JIGLE/situs")
      .replace(
        /\$\{\{\s*github\.event\.inputs\.version[^}]*\}\}/g,
        inputVersion.replace(/"/g, '\\"'),
      )
      .replace(/\$\{\{[^}]*\}\}/g, "")
  );
}

/** Run the script for a ref and return the `tags=` value it would set. */
function tagsFor(ref: string, inputVersion = ""): string[] {
  const dir = mkdtempSync(join(tmpdir(), "deploy-vars-"));
  const outputFile = join(dir, "github_output");
  writeFileSync(outputFile, "");
  const script = join(dir, "vars.sh");
  writeFileSync(script, decisionScript(inputVersion));

  execFileSync("bash", [script], {
    env: {
      ...process.env,
      GITHUB_REF: ref,
      GITHUB_SHA: "abc1234def5678",
      GITHUB_OUTPUT: outputFile,
    },
    stdio: "pipe",
  });

  const line = read(outputFile, "utf8")
    .split("\n")
    .find((l) => l.startsWith("tags="));
  if (!line) throw new Error("the vars step set no `tags` output");
  return line.slice("tags=".length).split(",").filter(Boolean);
}

const claimsLatest = (tags: string[]) => tags.some((t) => t.endsWith(":latest"));

describe("release channel", () => {
  it("a tag push claims the version and :latest", () => {
    // The positive control. Without it, "never emit :latest" would pass every case below and
    // releases would silently stop updating production.
    const tags = tagsFor("refs/tags/v1.25.0");

    expect(tags).toContain("ghcr.io/jigle/situs:1.25.0");
    expect(claimsLatest(tags)).toBe(true);
  });

  it("a push to main publishes :main and the commit, never :latest", () => {
    const tags = tagsFor("refs/heads/main");

    expect(tags).toContain("ghcr.io/jigle/situs:main");
    expect(tags).toContain("ghcr.io/jigle/situs:sha-abc1234");
    expect(claimsLatest(tags)).toBe(false);
  });

  it("a manual dispatch with a pre-release name takes only that name", () => {
    const tags = tagsFor("refs/heads/main", "1.25.0-rc1");

    expect(tags).toEqual(["ghcr.io/jigle/situs:1.25.0-rc1"]);
    expect(claimsLatest(tags)).toBe(false);
  });

  it("a bare version on a dispatch is refused and falls back to the commit", () => {
    // A bare number is reserved for tag pushes; accepting it here is how an image gets a release
    // identity it did not earn.
    const tags = tagsFor("refs/heads/main", "1.25.0");

    expect(tags.some((t) => t.endsWith(":1.25.0"))).toBe(false);
    expect(tags).toContain("ghcr.io/jigle/situs:sha-abc1234");
  });

  it("no non-tag ref can reach :latest", () => {
    // The property, stated once over every non-release path this workflow can be entered by.
    for (const ref of [
      "refs/heads/main",
      "refs/heads/claude/some-branch",
      "refs/heads/release/v2",
    ]) {
      expect(claimsLatest(tagsFor(ref)), `${ref} claimed :latest`).toBe(false);
    }
  });
});
