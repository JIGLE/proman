#!/usr/bin/env node
/**
 * Responsive audit harness.
 *
 * Walks every owner-facing surface (and the detail overlays reached via `?modal=`) at phone
 * width, in both themes, and measures what actually renders instead of relying on inspection:
 *
 *   - horizontal overflow of the PAGE (the defect), while ignoring content that overflows
 *     inside its own `overflow-x` container (the intended pattern) — so a scrollable table
 *     doesn't get reported as a bug but a too-wide stat row does
 *   - touch targets below the WCAG 2.2 AA floor (24px) and below the comfortable target (44px)
 *   - text rendering below a legibility floor
 *   - elements clipped outside the viewport
 *
 * Emits a ranked JSON report plus a readable Markdown summary and a screenshot per
 * surface/theme, so successive passes can be compared numerically rather than by eye.
 *
 * Usage:
 *   node scripts/mobile-audit.mjs                  # audit at 390x844, both themes
 *   node scripts/mobile-audit.mjs --seed           # (re)seed demo data first
 *   node scripts/mobile-audit.mjs --seed --strict  # ratchet: non-zero exit past BASELINE
 *   node scripts/mobile-audit.mjs --width 1440     # desktop regression pass
 *   node scripts/mobile-audit.mjs --locale pt      # longest-label locale
 *   node scripts/mobile-audit.mjs --only portfolio # filter surfaces by id substring
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.E2E_USER_EMAIL ?? "demo@situs.local";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "demo123";
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? "audit-report";
/**
 * Browser to drive. Empty means "let Playwright resolve its own install", which is what CI
 * needs — the workflow runs `npx playwright install --with-deps chromium` and the binary lands
 * wherever Playwright expects it.
 *
 * This used to default to `/opt/pw-browsers/chromium`, a path that only exists in the sandbox
 * this harness was written in. On a GitHub runner it does not, so every CI run died at
 * `browserType.launch` — and because the step carries `continue-on-error`, the job still
 * reported success. The ratchet had therefore never once executed in CI. Set
 * `PLAYWRIGHT_CHROMIUM` to override when a specific binary is needed.
 */
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM ?? "";

/** WCAG 2.2 AA "Target Size (Minimum)" is 24x24 CSS px; 44 is the comfortable mobile target. */
const TOUCH_FAIL = 24;
const TOUCH_WARN = 44;
/** Below this, body copy stops being comfortably legible on a phone. */
const MIN_FONT_PX = 12;
/** Sub-pixel layout rounding shouldn't count as overflow. */
const OVERFLOW_TOLERANCE = 1;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

/**
 * Locale to audit. Surface paths are written `/en/...`, but English is the SHORTEST of the
 * four catalogues — Portuguese and Spanish labels are materially longer, and label length
 * is what actually breaks a nav or a tab bar. Auditing only `/en` measures the best case.
 */
const LOCALE = opt("locale", "en");
const VIEWPORT_WIDTH = Number(opt("width", 390));
const VIEWPORT_HEIGHT = Number(opt("height", 844));
const ONLY = opt("only", null);
const THEMES = opt("theme", "dark,light").split(",");
const STRICT = flag("strict");

/**
 * Ratchet ceilings for `--strict`, in the spirit of `scripts/check-color-tokens.js`: a number
 * that may only ever go down. A run that exceeds any of these exits non-zero.
 *
 * `pageOverflow` is pinned at 0 and must stay there — it is the doctrine's first rule, it is
 * already met on every surface, and unlike the other metrics it has no legitimate reason to
 * regress.
 *
 * `smallText` is close to its floor. Of the 310 remaining, 264 are the bottom nav's own labels
 * at 11px — which is what native iOS/Android tab bars use, so they stay — and 44 are avatar
 * initials, a glyph sized to its circle rather than text to read. Do not chase this one to
 * zero; it would mean overriding two deliberate choices.
 *
 * `touchTargetFails: 4` is two links, each counted once per theme: "Política de Privacidade"
 * (188×16) and "Termos de Serviço" (139×16) in the landing footer. Both are text links in
 * prose, which the doctrine's rule 2 exempts only with explicit design review — so this is
 * recorded debt, not an accepted floor. It is also the whole of the metric: every other touch
 * target in the app now clears 44px below `md`.
 *
 * These come from a **seeded** run (`--seed --strict`, 52 surface-runs). An unseeded run walks
 * empty screens — a table with no rows cannot overflow — so its numbers are meaningless as a
 * baseline and `--strict` refuses to compare against them.
 *
 * Getting a trustworthy number here required fixing `lib/demo-seed.ts` first: it never deleted
 * documents or the bank graph, so each re-seed stacked another copy and the counts climbed on
 * every run (634 → 654 across two identical runs; 494 once the seed became idempotent). A
 * ratchet against a drifting fixture is worse than no ratchet.
 *
 * These figures now come from a **production standalone build against a freshly pushed
 * database** — the shape CI actually runs — rather than a dev server against a long-lived dev
 * DB. That distinction mattered more than expected: the first such run reported
 * `touchTargetFails: 27`, because a toast's dismiss glyph measured 9×26 and a toast can appear
 * over any screen (23 of 52 surface-runs). Every dev-server run had reported 2 and missed it.
 *
 * `surfaceRuns` must be 52. Anything lower means detail overlays were skipped for want of a
 * record id, and the totals are not comparable to these.
 */
const BASELINE = {
  pageOverflow: 0,
  touchTargetFails: 4,
  touchTargetWarns: 4,
  clippedContainers: 6,
  smallText: 310,
};

/**
 * Surfaces to audit. `modal` entries resolve a real record id at runtime (see resolveIds)
 * rather than hardcoding fixtures, so the overlay is measured with genuine content in it.
 */
const SURFACES = [
  { id: "landing", path: "/en", auth: false },
  { id: "signin", path: "/auth/signin", auth: false },
  { id: "signup", path: "/auth/signup", auth: false },
  { id: "dashboard", path: "/en/dashboard" },
  { id: "portfolio", path: "/en/portfolio" },
  // Detail overlays open via `?detail=<type>:<id>` (see lib/utils/entity-detail-url.ts).
  { id: "detail-property", path: "/en/portfolio?detail=property:{propertyId}", overlay: true },
  { id: "people", path: "/en/people" },
  { id: "detail-tenant", path: "/en/people?detail=tenant:{tenantId}", overlay: true },
  { id: "financials", path: "/en/financials" },
  { id: "financials-bank", path: "/en/financials?tab=bank" },
  { id: "financials-tax", path: "/en/financials?tab=tax" },
  { id: "operations", path: "/en/operations" },
  { id: "leases", path: "/en/leases" },
  { id: "detail-lease", path: "/en/leases?detail=lease:{leaseId}", overlay: true },
  { id: "documents", path: "/en/documents" },
  { id: "detail-document", path: "/en/documents?detail=document:{documentId}", overlay: true },
  { id: "intelligence", path: "/en/intelligence" },
  { id: "correspondence", path: "/en/correspondence" },
  { id: "buildings", path: "/en/buildings" },
  { id: "contacts", path: "/en/contacts" },
  { id: "contracts", path: "/en/contracts" },
  { id: "settings", path: "/en/settings" },
  // Account is a Settings section now; measure it where it lives rather than through the
  // /account redirect, so the surface id matches the URL that renders.
  { id: "account", path: "/en/settings?tab=account" },
  { id: "compliance-tax-filing", path: "/en/compliance/tax-filing" },
  { id: "compliance-modelo179", path: "/en/compliance/modelo179" },
  // Tenant portal: token-gated, so the whole path (not just an id) is substituted — the token
  // is minted at runtime via the same "invite tenant" API the owner-facing UI calls.
  { id: "tenant-portal", path: "{tenantPortalPath}", auth: false },
];

/**
 * Runs in the page. Returns the raw measurements — all judgement about severity is applied
 * on the Node side so the thresholds live in one place.
 */
function measure({ touchFail, touchWarn, minFontPx, tolerance }) {
  const vw = document.documentElement.clientWidth;

  const describe = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.split(/\s+/).filter(Boolean).slice(0, 4).join(".")
        : "";
    const id = el.id ? `#${el.id}` : "";
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return {
      tag: el.tagName.toLowerCase(),
      selector: `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 160),
      text,
    };
  };

  /**
   * Visually-hidden (`.sr-only`) elements are deliberately clipped to a 1px box for screen
   * readers. They are not layout defects and not tap targets, so every metric must skip them
   * or the report fills with false positives that drown the real findings.
   */
  const isVisuallyHidden = (el) => {
    if (typeof el.className === "string" && /\bsr-only\b/.test(el.className)) return true;
    const s = getComputedStyle(el);
    if (s.clipPath === "inset(50%)" || s.clip === "rect(0px, 0px, 0px, 0px)") return true;
    const r = el.getBoundingClientRect();
    return r.width <= 1 && r.height <= 1;
  };

  /** True when some ancestor is a legitimate horizontal scroll/clip container. */
  const insideScrollContainer = (el) => {
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const ox = getComputedStyle(node).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
      node = node.parentElement;
    }
    return false;
  };

  const all = Array.from(document.querySelectorAll("*"));

  // --- page-level horizontal overflow -------------------------------------------------
  const scroller = document.scrollingElement ?? document.documentElement;
  const pageOverflow = Math.max(0, scroller.scrollWidth - scroller.clientWidth);

  // --- which elements actually stick out past the viewport ----------------------------
  const offendingEls = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (Math.round(r.right - vw) <= tolerance) continue;
    if (isVisuallyHidden(el)) continue;
    if (insideScrollContainer(el)) continue; // scrolling inside its own box: intended
    offendingEls.push(el);
  }
  // Report only the outermost offender in each subtree — a too-wide table should name itself,
  // not each of its forty cells. An element is redundant if an ancestor also overflows.
  const offendingSet = new Set(offendingEls);
  const dedupedOverflow = offendingEls
    .filter((el) => {
      let p = el.parentElement;
      while (p) {
        if (offendingSet.has(p)) return false;
        p = p.parentElement;
      }
      return true;
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        ...describe(el),
        overhang: Math.round(r.right - vw),
        width: Math.round(r.width),
      };
    })
    .sort((a, b) => b.overhang - a.overhang);

  // --- overflow INSIDE a container ----------------------------------------------------
  // Excluding scroll containers from the page-overflow check above is right (a scrollable
  // matrix is the intended pattern), but it also hides real defects: a tab bar whose tabs
  // run off the edge, or a stat row clipping a currency value, are both "overflow inside a
  // container" and both wrong. Report them separately so a human judges intent per case.
  const containerOverflow = [];
  for (const el of all) {
    const style = getComputedStyle(el);
    const ox = style.overflowX;
    if (ox !== "auto" && ox !== "scroll" && ox !== "hidden") continue;
    const hidden = ox === "hidden";
    const amount = el.scrollWidth - el.clientWidth;
    if (amount <= tolerance) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (isVisuallyHidden(el)) continue;
    containerOverflow.push({
      ...describe(el),
      amount: Math.round(amount),
      clientWidth: Math.round(el.clientWidth),
      // `hidden` means the overflowing content is unreachable — strictly worse than
      // `auto`/`scroll`, where the user can at least scroll to it.
      clipped: hidden,
      role: el.getAttribute("role") ?? null,
    });
  }

  // --- touch targets ------------------------------------------------------------------
  const interactive = Array.from(
    document.querySelectorAll(
      'button, a[href], [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
  const smallTargets = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    if (isVisuallyHidden(el)) continue;
    const min = Math.min(r.width, r.height);
    if (min >= touchWarn) continue;
    smallTargets.push({
      ...describe(el),
      w: Math.round(r.width),
      h: Math.round(r.height),
      severity: min < touchFail ? "fail" : "warn",
    });
  }

  // --- small text ---------------------------------------------------------------------
  const smallText = [];
  for (const el of all) {
    const direct = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
    );
    if (!direct) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size >= minFontPx) continue;
    smallText.push({ ...describe(el), fontSize: size });
  }

  // --- clipped outside the viewport ---------------------------------------------------
  const clipped = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (isVisuallyHidden(el)) continue;
    if (r.right <= 0 || r.left >= vw) clipped.push({ ...describe(el), left: Math.round(r.left) });
  }

  return {
    viewportWidth: vw,
    pageOverflow,
    docScrollWidth: scroller.scrollWidth,
    overflowOffenders: dedupedOverflow.slice(0, 12),
    containerOverflow: containerOverflow.sort((a, b) => b.amount - a.amount).slice(0, 12),
    containerOverflowCount: containerOverflow.length,
    clippedContainerCount: containerOverflow.filter((c) => c.clipped).length,
    smallTargets: smallTargets.slice(0, 25),
    smallTargetCount: smallTargets.length,
    smallTargetFailCount: smallTargets.filter((t) => t.severity === "fail").length,
    smallText: smallText.slice(0, 10),
    smallTextCount: smallText.length,
    clipped: clipped.slice(0, 10),
    verticalScroll: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
  };
}

async function login(page) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
  // The form is client-rendered, so it isn't in the DOM at domcontentloaded.
  const emailInput = page.locator('input[name="email"]');
  try {
    await emailInput.waitFor({ state: "visible", timeout: 30000 });
  } catch {
    throw new Error(
      "Credentials sign-in form not found on /auth/signin. The audit needs a dev server with the credentials provider enabled.",
    );
  }
  await emailInput.fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  // Match the form's submit button structurally, not by label: the auth pages are localized
  // and default to Portuguese, so a hardcoded "Sign in" stopped matching.
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/(en|pt|es|it)(\/|$|\?)/, { timeout: 20000 });
}

/** Pull real record ids so the `?modal=` overlays are measured with genuine content. */
async function resolveIds(page) {
  // Every branch here used to return a bare `null`, so a 500 from an endpoint and an
  // empty-but-healthy list were indistinguishable — the run just reported "no propertyId" and
  // skipped the overlay. Say which of the two it was: they need opposite fixes, and a skipped
  // surface silently shrinks `surfaceRuns` below the 52 the baseline was measured at.
  const get = async (path, pick) => {
    try {
      const res = await page.request.get(`${BASE}${path}`);
      if (!res.ok()) {
        console.warn(`[audit] ${path} → ${res.status()} ${(await res.text()).slice(0, 200)}`);
        return null;
      }
      const body = await res.json();
      const list = Array.isArray(body) ? body : (body.data ?? body.properties ?? body.tenants);
      if (!Array.isArray(list)) {
        console.warn(`[audit] ${path} → no array in ${JSON.stringify(body).slice(0, 200)}`);
        return null;
      }
      if (list.length === 0) {
        console.warn(`[audit] ${path} → empty list (seed produced no rows for this user?)`);
        return null;
      }
      return pick(list[0]);
    } catch (err) {
      console.warn(`[audit] ${path} → threw ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };
  const tenantId = await get("/api/tenants", (t) => t.id);

  // The tenant portal is reached via a signed token minted on demand (no stored value to GET),
  // so mint one the same way the app's own "invite tenant" flow does: POST is CSRF-guarded.
  let tenantPortalPath = null;
  if (tenantId) {
    try {
      await page.request.get(`${BASE}/api/csrf-token`);
      const cookies = await page.context().cookies();
      const csrf = cookies.find((c) => c.name === "csrf-token")?.value;
      const res = await page.request.post(`${BASE}/api/tenants/${tenantId}/portal-link`, {
        headers: csrf ? { "x-csrf-token": csrf } : {},
        data: {},
      });
      if (res.ok()) {
        const body = await res.json();
        const portalLink = body?.data?.portalLink;
        if (portalLink) tenantPortalPath = new URL(portalLink).pathname;
      }
    } catch {
      tenantPortalPath = null;
    }
  }

  return {
    propertyId: await get("/api/properties", (p) => p.id),
    tenantId,
    leaseId: await get("/api/leases", (l) => l.id),
    documentId: await get("/api/documents", (d) => d.id),
    tenantPortalPath,
  };
}

async function auditSurface(context, surface, theme, ids) {
  const page = await context.newPage();
  await page.addInitScript(
    (mode) => {
      localStorage.setItem("situs-mode", mode);
    },
    theme === "dark" ? "dark" : "normal",
  );
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });

  const path = surface.path
    .replace(/\{(\w+)\}/g, (_m, key) => ids[key] ?? "")
    // Locale-prefixed routes only; /auth/* and /tenant-portal/* carry no prefix.
    .replace(/^\/en(?=\/|$)/, `/${LOCALE}`);
  const url = `${BASE}${path}`;

  const result = {
    id: surface.id,
    theme,
    url,
    status: "ok",
  };

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    result.httpStatus = response?.status() ?? null;
    // Let data fetches and entrance animations settle before measuring.
    //
    // This budget used to be 20s and its timeout was swallowed by a bare `.catch(() => {})`,
    // which made a systemic stall invisible and very expensive: the first CI run that walked
    // 52 seeded surfaces spent >24 minutes here and was killed by the job's 30-minute cap,
    // because something in that environment never lets the page reach networkidle (it settles
    // fine locally, which is why no local run ever showed this). 52 surface-runs × 20s is
    // ~17 minutes of pure waiting on its own.
    //
    // Cap it at 5s and record when it doesn't settle. `networkidle` is a nicety here — the
    // measurement only needs content painted, which the fixed delay below covers — so a
    // surface that never idles should cost a little and be visible, not cost 20s and be silent.
    const idled = await page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    result.reachedNetworkIdle = idled;
    await page.waitForTimeout(900);

    if (surface.overlay) {
      // An overlay surface that silently fails to open would otherwise be measured as its
      // underlying page and reported as "clean" — the exact false negative that hid the
      // property-detail surface on the first run. Require the dialog to actually be present.
      const dialog = page.locator('[role="dialog"]').first();
      try {
        await dialog.waitFor({ state: "visible", timeout: 15000 });
        await page.waitForTimeout(600); // mount transition
      } catch {
        result.status = "overlay-not-opened";
        result.error = `Overlay never rendered for ${path} — no visible [role="dialog"]`;
        const shot = join(OUT_DIR, "shots", `${surface.id}-${theme}-${VIEWPORT_WIDTH}-FAILED.png`);
        mkdirSync(dirname(shot), { recursive: true });
        await page.screenshot({ path: shot });
        return result;
      }
    }

    Object.assign(
      result,
      await page.evaluate(measure, {
        touchFail: TOUCH_FAIL,
        touchWarn: TOUCH_WARN,
        minFontPx: MIN_FONT_PX,
        tolerance: OVERFLOW_TOLERANCE,
      }),
    );

    const shot = join(OUT_DIR, "shots", `${surface.id}-${theme}-${VIEWPORT_WIDTH}.png`);
    mkdirSync(dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, fullPage: false });
    result.screenshot = shot;
  } catch (err) {
    result.status = "error";
    result.error = err instanceof Error ? err.message : String(err);
  } finally {
    await page.close();
  }
  return result;
}

/** Rank so the worst offenders sort to the top of the report. */
function score(r) {
  if (r.status === "error") return -1;
  return (
    (r.pageOverflow ?? 0) * 10 +
    (r.smallTargetFailCount ?? 0) * 8 +
    ((r.smallTargetCount ?? 0) - (r.smallTargetFailCount ?? 0)) * 2 +
    (r.smallTextCount ?? 0) * 2 +
    (r.clipped?.length ?? 0) * 6 +
    (r.clippedContainerCount ?? 0) * 7
  );
}

function toMarkdown(results, meta) {
  const lines = [];
  lines.push(`# Responsive audit — ${meta.viewport} — locale ${meta.locale}`);
  lines.push("");
  lines.push(`Run: ${meta.when} · base \`${BASE}\` · themes ${meta.themes.join(", ")}`);
  lines.push("");

  const broken = results.filter((r) => r.status === "error");
  const ok = results.filter((r) => r.status !== "error");
  const overflowing = ok.filter((r) => r.pageOverflow > 0);

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Surfaces audited | ${ok.length} |`);
  lines.push(`| Surfaces failing to load | ${broken.length} |`);
  lines.push(`| **Surfaces with page-level horizontal overflow** | **${overflowing.length}** |`);
  lines.push(
    `| Touch targets under ${TOUCH_FAIL}px (WCAG 2.2 AA fail) | ${ok.reduce((a, r) => a + (r.smallTargetFailCount ?? 0), 0)} |`,
  );
  lines.push(
    `| Touch targets under ${TOUCH_WARN}px | ${ok.reduce((a, r) => a + (r.smallTargetCount ?? 0), 0)} |`,
  );
  lines.push(
    `| Text under ${MIN_FONT_PX}px | ${ok.reduce((a, r) => a + (r.smallTextCount ?? 0), 0)} |`,
  );
  lines.push(
    `| Interactive elements clipped offscreen | ${ok.reduce((a, r) => a + (r.clipped?.length ?? 0), 0)} |`,
  );
  lines.push(
    `| **Containers clipping content (\`overflow:hidden\`, unreachable)** | **${ok.reduce((a, r) => a + (r.clippedContainerCount ?? 0), 0)}** |`,
  );
  lines.push(
    `| Containers overflowing but scrollable | ${ok.reduce((a, r) => a + ((r.containerOverflowCount ?? 0) - (r.clippedContainerCount ?? 0)), 0)} |`,
  );
  lines.push("");

  if (broken.length) {
    lines.push("## Failed to load");
    lines.push("");
    for (const r of broken) lines.push(`- \`${r.id}\` (${r.theme}) — ${r.error}`);
    lines.push("");
  }

  lines.push("## Surfaces, worst first");
  lines.push("");
  for (const r of [...ok].sort((a, b) => score(b) - score(a))) {
    const badges = [];
    if (r.pageOverflow > 0) badges.push(`overflow +${r.pageOverflow}px`);
    if (r.smallTargetFailCount) badges.push(`${r.smallTargetFailCount} targets <${TOUCH_FAIL}px`);
    if (r.smallTargetCount - r.smallTargetFailCount)
      badges.push(`${r.smallTargetCount - r.smallTargetFailCount} targets <${TOUCH_WARN}px`);
    if (r.smallTextCount) badges.push(`${r.smallTextCount} text <${MIN_FONT_PX}px`);
    if (r.clipped?.length) badges.push(`${r.clipped.length} offscreen`);
    if (r.clippedContainerCount) badges.push(`${r.clippedContainerCount} clipped containers`);
    if (!badges.length) badges.push("clean");

    lines.push(`### \`${r.id}\` — ${r.theme}`);
    lines.push("");
    lines.push(`${badges.join(" · ")}`);
    lines.push("");
    if (r.overflowOffenders?.length) {
      lines.push("Widest elements past the viewport edge:");
      lines.push("");
      for (const o of r.overflowOffenders.slice(0, 6)) {
        lines.push(`- \`+${o.overhang}px\` \`${o.selector}\`${o.text ? ` — "${o.text}"` : ""}`);
      }
      lines.push("");
    }
    if (r.containerOverflow?.length) {
      lines.push("Content overflowing its container:");
      lines.push("");
      for (const c of r.containerOverflow.slice(0, 6)) {
        lines.push(
          `- \`+${c.amount}px\` past \`${c.clientWidth}px\` ${c.clipped ? "**CLIPPED (unreachable)**" : "scrollable"} \`${c.selector}\`${c.role ? ` [role=${c.role}]` : ""}${c.text ? ` — "${c.text}"` : ""}`,
        );
      }
      lines.push("");
    }
    if (r.smallTargets?.length) {
      const worst = r.smallTargets.filter((t) => t.severity === "fail").slice(0, 5);
      if (worst.length) {
        lines.push(`Targets under ${TOUCH_FAIL}px:`);
        lines.push("");
        for (const t of worst)
          lines.push(`- \`${t.w}×${t.h}\` \`${t.selector}\`${t.text ? ` — "${t.text}"` : ""}`);
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    locale: LOCALE,
    deviceScaleFactor: 2,
  });
  // Surfaces marked `auth: false` (landing, signin, signup) must never see the bootstrap
  // session below — an authenticated visit to /auth/signin silently redirects to /dashboard,
  // which would mislabel the dashboard's own violations as belonging to the signin/signup pages.
  const anonContext = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    locale: LOCALE,
    deviceScaleFactor: 2,
  });
  // LocaleSelectOverlay is a blocking, full-screen first-visit language chooser, shown whenever
  // `situs.locale.selected` is absent. A fresh Playwright context is always a "first visit", so
  // without this the signed-out surfaces were being measured underneath that overlay — the page's
  // own controls sat behind a z-[99999] scrim and the numbers described the chooser, not the page.
  // Presenting as a returning visitor measures the surface these routes actually serve.
  await anonContext.addInitScript((locale) => {
    try {
      localStorage.setItem("situs.locale.selected", locale);
    } catch {
      /* storage disabled — the overlay just shows, same as a real first visit */
    }
  }, LOCALE);

  const bootstrap = await context.newPage();
  await login(bootstrap);

  if (flag("seed")) {
    // State-changing API calls are CSRF-guarded: the proxy requires the `csrf-token` cookie and
    // the `x-csrf-token` header to match, so fetch a token first and echo it back.
    await bootstrap.request.get(`${BASE}/api/csrf-token`);
    const cookies = await context.cookies();
    const csrf = cookies.find((c) => c.name === "csrf-token")?.value;
    const res = await bootstrap.request.post(`${BASE}/api/debug/db/seed`, {
      headers: csrf ? { "x-csrf-token": csrf } : {},
    });
    console.log(`[audit] seed → ${res.status()}${res.ok() ? "" : ` ${await res.text()}`}`);
    // A seed that silently no-ops is the difference between measuring the app and measuring its
    // empty states, and the resulting numbers look plausible either way. Fail here rather than
    // let a run that seeded nothing be mistaken for a baseline.
    if (!res.ok()) {
      throw new Error(
        `Seeding failed (${res.status()}). The audit's numbers describe empty screens without it.`,
      );
    }
  }

  // Resolve with a short poll rather than a blind sleep. The fixed 2500ms wait that used to sit
  // after the seed was sometimes not enough: three consecutive local runs resolved `documentId`
  // (fetched last) but not `tenantId`/`propertyId`/`leaseId` (fetched first), which is the
  // signature of reading while the seed's deleteMany-then-recreate is still in flight. That
  // silently produced 44 surface-runs instead of 52 — a smaller, quietly incomparable run.
  // `--strict` does treat a skip as a failure, so this never corrupted a baseline, but it did
  // make the gate flaky, and a flaky gate gets ignored.
  let ids = await resolveIds(bootstrap);
  const complete = (v) => Object.values(v).every(Boolean);
  for (let attempt = 1; attempt <= 6 && !complete(ids); attempt++) {
    console.log(`[audit] incomplete ids, retrying (${attempt}/6)`);
    await bootstrap.waitForTimeout(1000);
    ids = await resolveIds(bootstrap);
  }
  console.log("[audit] resolved ids:", JSON.stringify(ids));
  // Same reasoning: if the seed reported success but no records came back, something upstream is
  // wrong and every detail-overlay surface is about to be skipped. Say so with the detail.
  if (flag("seed") && Object.values(ids).every((v) => !v)) {
    throw new Error(
      "Seed reported success but no record ids could be resolved — every detail overlay would " +
        "be skipped and the totals would not be comparable to the baseline.",
    );
  }
  await bootstrap.close();

  const surfaces = ONLY ? SURFACES.filter((s) => s.id.includes(ONLY)) : SURFACES;
  const results = [];
  const skipped = [];
  for (const surface of surfaces) {
    for (const theme of THEMES) {
      if (surface.path.includes("{")) {
        const key = surface.path.match(/\{(\w+)\}/)?.[1];
        if (key && !ids[key]) {
          console.log(`[audit] skip ${surface.id} (${theme}) — no ${key} available`);
          skipped.push(`${surface.id} (${theme}): no ${key}`);
          continue;
        }
      }
      const r = await auditSurface(
        surface.auth === false ? anonContext : context,
        surface,
        theme,
        ids,
      );
      results.push(r);
      const tag =
        r.status === "error"
          ? "ERROR"
          : r.pageOverflow > 0
            ? `OVERFLOW +${r.pageOverflow}px`
            : "ok";
      console.log(
        `[audit] ${surface.id.padEnd(28)} ${theme.padEnd(5)} ${tag}` +
          (r.status !== "ok"
            ? ` — ${r.error}`
            : ` · targets<${TOUCH_WARN}: ${r.smallTargetCount} · clipped containers: ${r.clippedContainerCount} · scrolling containers: ${(r.containerOverflowCount ?? 0) - (r.clippedContainerCount ?? 0)}`),
      );
    }
  }

  await context.close();
  await anonContext.close();
  await browser.close();

  const meta = {
    when: new Date().toISOString(),
    viewport: `${VIEWPORT_WIDTH}×${VIEWPORT_HEIGHT}`,
    locale: LOCALE,
    themes: THEMES,
    seeded: flag("seed"),
  };

  /**
   * Pre-aggregated totals. CI reads these directly instead of reducing over `results` in jq —
   * the previous workflow dug for `.surfaces[]`, `.horizontalOverflow.exceeded` and
   * `.touchTargets.violations`, none of which have ever existed on this report, so every query
   * resolved to nothing and the PR summary printed a row of zeroes no matter what was measured.
   * One shallow, named object is far harder to silently mis-address.
   */
  const summary = {
    surfaceRuns: results.length,
    failedToLoad: results.filter((r) => r.status === "error").length,
    pageOverflow: results.filter((r) => r.status !== "error" && r.pageOverflow > 0).length,
    touchTargetFails: sum(results, "smallTargetFailCount"),
    touchTargetWarns: sum(results, "smallTargetCount"),
    clippedContainers: sum(results, "clippedContainerCount"),
    smallText: sum(results, "smallTextCount"),
  };

  // Not a ratcheted metric — it measures the harness's environment, not the app's design — but
  // it must be visible. A run where most surfaces never reach networkidle is a run paying the
  // full wait budget on nearly every one of them, which is what turned a ~2 minute job into a
  // >24 minute one that the 30-minute cap killed.
  const neverIdled = results.filter((r) => r.reachedNetworkIdle === false).length;
  if (neverIdled > 0) {
    console.log(
      `[audit] ${neverIdled}/${results.length} surface-runs never reached networkidle ` +
        `(capped at 5s each). Expect the run to be slower by roughly ${neverIdled * 5}s.`,
    );
  }

  writeFileSync(
    join(OUT_DIR, `report-${VIEWPORT_WIDTH}.json`),
    JSON.stringify({ meta, summary, results, neverIdled }, null, 2),
  );
  writeFileSync(join(OUT_DIR, `report-${VIEWPORT_WIDTH}.md`), toMarkdown(results, meta));
  console.log(`\n[audit] wrote ${OUT_DIR}/report-${VIEWPORT_WIDTH}.{json,md}`);
  console.log(`[audit] summary ${JSON.stringify(summary)}`);

  if (!STRICT) return;

  if (!meta.seeded) {
    console.error(
      "\n✖ --strict requires --seed. Against an empty database the harness walks empty screens," +
        " so every count is trivially low and passing the ratchet would prove nothing.",
    );
    process.exit(2);
  }

  // A skipped surface silently shrinks the denominator, so a run that audits fewer screens
  // scores better on every total. Observed for real: `tenant-portal` needs a freshly minted
  // token, and two consecutive runs skipped it while a third did not — moving `surfaceRuns`
  // between 50 and 52 and taking its text nodes with it. Under `--strict` the surface set has
  // to be fixed, so a skip is a failure rather than a quiet footnote.
  if (skipped.length) {
    console.error(`\n✖ ${skipped.length} surface-run(s) skipped, so the totals are not
comparable to the baseline:\n  ${skipped.join("\n  ")}`);
    process.exit(3);
  }

  const regressions = Object.entries(BASELINE)
    .filter(([metric, ceiling]) => summary[metric] > ceiling)
    .map(([metric, ceiling]) => `  ${metric}: ${summary[metric]} exceeds baseline ${ceiling}`);

  if (regressions.length) {
    console.error(`\n✖ Mobile audit regressed:\n${regressions.join("\n")}`);
    console.error("\nFix the surface, or lower BASELINE in scripts/mobile-audit.mjs if a metric");
    console.error("legitimately moved — never raise it to make a red run go green.");
    process.exit(1);
  }

  const improved = Object.entries(BASELINE)
    .filter(([metric, ceiling]) => summary[metric] < ceiling)
    .map(([metric, ceiling]) => `${metric} ${summary[metric]} < ${ceiling}`);
  console.log(
    improved.length
      ? `\n✓ Mobile audit within baseline — tighten it: ${improved.join(", ")}`
      : "\n✓ Mobile audit exactly at baseline",
  );
}

/** Total a numeric field across surface runs, tolerating surfaces that failed to load. */
function sum(results, field) {
  return results.reduce((acc, r) => acc + (r[field] ?? 0), 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
