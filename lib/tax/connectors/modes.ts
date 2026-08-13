/**
 * The only modes a connector may act in — and nothing else.
 *
 * WHY THIS FILE HAS NO IMPORTS, AND MUST KEEP NONE.
 *
 * This set is needed in two places that cannot share a module graph: the server-side guard
 * (`mode-guard.ts`, which writes a TaxSubmissionLog row and therefore reaches Prisma) and the
 * client-side presentation helper (`presentation.ts`, imported by two "use client" components).
 *
 * It originally lived in `mode-guard.ts` and `presentation.ts` imported it from there. That was
 * a deliberate choice — one list, so widening it for a real integration updates the UI in the
 * same move — but it built a chain from a browser bundle to a native binary:
 *
 *   settings-integrations.tsx  (use client)
 *     → presentation.ts
 *       → mode-guard.ts
 *         → connector-service.ts
 *           → database.ts → @prisma/adapter-better-sqlite3 → better-sqlite3 → bindings (.node)
 *
 * `next build` failed on it; `tsc --noEmit`, ESLint and Vitest all passed, because none of them
 * bundle for the browser. Splitting the constant out keeps the single source of truth and cuts
 * the chain at its first link.
 *
 * So: no imports here, ever. Adding one re-creates the bug the moment it reaches a server-only
 * module.
 */

/**
 * No country has a live tax-authority integration. Every connector simulates the round trip, so
 * simulating is opt-in per mode and everything else fails closed — see `mode-guard.ts` for the
 * refusal, and `presentation.ts` for how an unsupported mode is surfaced to the operator.
 */
export const SIMULATED_MODES: ReadonlySet<string> = new Set(["sandbox", "review"]);
