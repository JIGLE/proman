/**
 * Demo API Handler
 *
 * Shared helper for API routes to handle demo mode requests.
 * - GET requests return demo data from the local demo store
 * - Mutation requests (POST/PUT/DELETE) persist changes to the demo store
 */

import { NextResponse } from "next/server";
import { isDemoRequest, DEMO_USER } from "./demo-mode";
import { type DemoEntityType } from "./demo-data";
import {
  getDemoStoreData,
  getDemoStoreDataById,
  addDemoEntity,
  updateDemoEntity,
  removeDemoEntity,
} from "./demo-local-state";

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

  const data = getDemoStoreData(entityType);
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

  const item = getDemoStoreDataById(entityType, id);
  if (!item) {
    return {
      isDemo: true,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
      userId: DEMO_USER.id,
    };
  }

  return {
    isDemo: true,
    response: NextResponse.json({ data: item }),
    userId: DEMO_USER.id,
  };
}

/**
 * Handle a demo mutation request (POST/PUT/DELETE).
 * Mutations persist to the sessionStorage-backed demo store.
 */
export async function handleDemoMutation(
  request: Request,
  entityType: DemoEntityType,
): Promise<DemoHandlerResult> {
  if (!isDemoRequest(request)) {
    return { isDemo: false, response: null, userId: "" };
  }

  const method = request.method.toUpperCase();

  if (method === "DELETE") {
    // Extract ID from URL path (last segment)
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments[segments.length - 1];

    if (id && id !== entityType) {
      removeDemoEntity(entityType, id);
    }

    return {
      isDemo: true,
      response: NextResponse.json({
        data: { message: `${entityType} deleted successfully` },
      }),
      userId: DEMO_USER.id,
    };
  }

  // POST or PUT — parse body and persist to store
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body
  }

  if (method === "POST") {
    const created = addDemoEntity(entityType, body);
    return {
      isDemo: true,
      response: NextResponse.json({ data: created }, { status: 201 }),
      userId: DEMO_USER.id,
    };
  }

  // PUT — extract ID from URL
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 1];

  if (id && id !== entityType) {
    const updated = updateDemoEntity(entityType, id, body);
    if (updated) {
      return {
        isDemo: true,
        response: NextResponse.json({ data: updated }),
        userId: DEMO_USER.id,
      };
    }
  }

  return {
    isDemo: true,
    response: NextResponse.json({ error: "Not found" }, { status: 404 }),
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
