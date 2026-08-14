import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";

/**
 * No container may be handed a writable path inside the build context.
 *
 * `deploy-ghcr.yml` builds the image, scans it, then builds again to push. The scan runs Trivy in
 * a container, and Docker creates the host side of any bind mount as **root**. Point that mount
 * inside the checkout and the second build — which sends the checkout as its build context, as
 * the unprivileged `runner` user — cannot read what root just wrote:
 *
 *   ERROR: failed to solve: error from sender: open .trivycache/fanal: permission denied
 *
 * That broke every deploy between 2026-08-12 (when the scan was added, mounting
 * `${{ github.workspace }}/.trivycache`) and 2026-08-14. It is worth pinning rather than
 * remembering: the build reaches this point ~10 minutes in, every layer reports CACHED, and the
 * error names neither Trivy nor the step that actually caused it.
 *
 * The rule is about the mount SOURCE — the host path. Mounting the Docker socket is fine, and so
 * is any path under `runner.temp`, which sits outside the checkout.
 */

interface Workflow {
  jobs: Record<string, { steps?: { name?: string; run?: string }[] }>;
}

const WORKFLOW = join(process.cwd(), ".github", "workflows", "deploy-ghcr.yml");

/** Every `-v <source>:<target>` bind mount in a step's shell script, paired with its step name. */
function bindMounts(): { step: string; source: string }[] {
  const workflow = load(readFileSync(WORKFLOW, "utf8")) as Workflow;
  const found: { step: string; source: string }[] = [];

  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    for (const step of job.steps ?? []) {
      if (!step.run) continue;
      // `-v` / `--volume`, then the source up to the colon that separates it from the target.
      for (const match of step.run.matchAll(/(?:-v|--volume)[ \t]+"?([^":\n]+):/g)) {
        found.push({ step: step.name ?? `${jobId} (unnamed step)`, source: match[1] });
      }
    }
  }
  return found;
}

describe("deploy build-context hygiene", () => {
  it("finds the mounts it is meant to be checking", () => {
    // Without this, a regex that silently stopped matching would make every assertion below
    // vacuously true — the inert-green failure this repo keeps producing.
    const mounts = bindMounts();

    expect(mounts.length).toBeGreaterThan(0);
    expect(mounts.some((m) => m.source.includes("docker.sock"))).toBe(true);
  });

  it("mounts nothing from the build context into a container", () => {
    const offenders = bindMounts().filter((m) => m.source.includes("github.workspace"));

    expect(
      offenders,
      `these mounts put a root-owned path inside the build context: ${offenders
        .map((o) => `${o.step} → ${o.source}`)
        .join(", ")}`,
    ).toEqual([]);
  });
});
