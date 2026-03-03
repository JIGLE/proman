import { NextResponse } from "next/server";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Lightweight readiness/startup probe endpoint.
 *
 * Returns HTTP 200 as soon as the Node.js process can serve requests,
 * regardless of database initialization status.  This prevents Kubernetes
 * (and TrueNAS SCALE) from keeping the pod in "Deploying" state while
 * the prestart script is still running `prisma db push`.
 *
 * Use this for startupProbe and readinessProbe.
 * Use /api/health (which checks the DB) for livenessProbe.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200, headers: HEADERS },
  );
}

/** HEAD handler — needed for wget --spider and some K8s probes. */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: HEADERS });
}
