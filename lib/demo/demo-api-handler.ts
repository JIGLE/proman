/**
 * Demo API Handler
 *
 * Shared helper for API routes to handle demo mode requests.
 * - GET requests return demo data from the demo dataset
 * - Mutation requests (POST/PUT/DELETE) return simulated success
 */

import { NextResponse } from "next/server";
import { isDemoRequest, DEMO_USER } from "./demo-mode";
import { getDemoData, getDemoDataById, type DemoEntityType } from "./demo-data";

interface DemoHandlerResult {
  /** Whether the request is in demo mode */
  isDemo: boolean;
  /** Pre-built response if demo mode handled the request, otherwise null */
  response: NextResponse | null;
  /** Demo user ID for use in demo mode auth */
  userId: string;
}

/**
 * Check if a request is in demo mode and return appropriate responses.
 *
 * Usage in API routes:
 * ```ts
 * const demo = handleDemoGet(request, "properties");
 * if (demo.response) return demo.response;
 * // ... continue with real data handling
 * ```
 */
export function handleDemoGet(request: Request, entityType: DemoEntityType): DemoHandlerResult {
  if (!isDemoRequest(request)) {
    return { isDemo: false, response: null, userId: "" };
  }

  const data = getDemoData(entityType);
  return {
    isDemo: true,
    response: NextResponse.json({ data }),
    userId: DEMO_USER.id,
  };
}

/**
 * Handle a demo GET-by-ID request.
 */
export function handleDemoGetById(
  request: Request,
  entityType: DemoEntityType,
  id: string,
): DemoHandlerResult {
  if (!isDemoRequest(request)) {
    return { isDemo: false, response: null, userId: "" };
  }

  const item = getDemoDataById(entityType, id);
  if (!item) {
    return {
      isDemo: true,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
      userId: DEMO_USER.id,
    };
  }

  return {
    isDemo: true,
    response: NextResponse.json(item),
    userId: DEMO_USER.id,
  };
}

/**
 * Handle a demo mutation request (POST/PUT/DELETE).
 * Returns a simulated success response without touching the database.
 */
export function handleDemoMutation(
  request: Request,
  entityType: DemoEntityType,
): DemoHandlerResult {
  if (!isDemoRequest(request)) {
    return { isDemo: false, response: null, userId: "" };
  }

  const method = request.method.toUpperCase();

  if (method === "DELETE") {
    return {
      isDemo: true,
      response: NextResponse.json({
        success: true,
        demo: true,
        message: "Demo mode: deletion simulated",
      }),
      userId: DEMO_USER.id,
    };
  }

  // POST or PUT — return a simulated created/updated entity
  return {
    isDemo: true,
    response: NextResponse.json(
      {
        success: true,
        demo: true,
        message: "Demo mode: changes are not saved",
        data: {
          id: `demo-${entityType}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: method === "POST" ? 201 : 200 },
    ),
    userId: DEMO_USER.id,
  };
}

/**
 * Quick check: if request is demo mode, handle auth and return demo userId.
 * Returns null if not in demo mode.
 */
export function getDemoAuth(
  request: Request,
): { userId: string; session: { user: typeof DEMO_USER } } | null {
  if (!isDemoRequest(request)) return null;
  return {
    userId: DEMO_USER.id,
    session: { user: { ...DEMO_USER } },
  };
}
