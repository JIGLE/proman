import { NextResponse } from "next/server";

/**
 * What is actually running.
 *
 * `buildTime` used to fall back to `new Date().toISOString()` — the time of the REQUEST, formatted
 * exactly like a build timestamp. It was used to check whether a deploy had landed and answered
 * with a fresh, plausible, wrong value every time. A confident wrong answer is worse than none,
 * because nobody re-checks a number that looks right.
 *
 * All three now report "unknown" when the build did not supply them, which is the honest state for
 * a locally built image (`docker build` without `--build-arg`). The workflow passes all three; see
 * the runner stage of the Dockerfile for the ENV lines that carry them into the process.
 *
 * `public/version.json` carries the same three values as a static file, written at build time.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    version: process.env.BUILD_VERSION || "unknown",
    gitCommit: process.env.GIT_COMMIT || "unknown",
    buildTime: process.env.BUILD_TIME || "unknown",
  });
}
