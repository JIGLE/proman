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
 *   node scripts/mobile-audit.mjs --width 1440     # desktop regression pass
 *   node scripts/mobile-audit.mjs --only portfolio # filter surfaces by id substring
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.E2E_USER_EMAIL ?? "demo@proman.local";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "demo123";
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? "audit-report";
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium";

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

const VIEWPORT_WIDTH = Number(opt("width", 390));
const VIEWPORT_HEIGHT = Number(opt("height", 844));
const ONLY = opt("only", null);
const THEMES = opt("theme", "dark,light").split(",");

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
  { id: "account", path: "/en/account" },
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
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(en|pt|es|it)(\/|$|\?)/, { timeout: 20000 });
}

/** Pull real record ids so the `?modal=` overlays are measured with genuine content. */
async function resolveIds(page) {
  const get = async (path, pick) => {
    try {
      const res = await page.request.get(`${BASE}${path}`);
      if (!res.ok()) return null;
      const body = await res.json();
      const list = Array.isArray(body) ? body : (body.data ?? body.properties ?? body.tenants);
      if (!Array.isArray(list) || list.length === 0) return null;
      return pick(list[0]);
    } catch {
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

  const path = surface.path.replace(/\{(\w+)\}/g, (_m, key) => ids[key] ?? "");
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
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
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
  lines.push(`# Responsive audit — ${meta.viewport}`);
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
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 2,
  });
  // Surfaces marked `auth: false` (landing, signin, signup) must never see the bootstrap
  // session below — an authenticated visit to /auth/signin silently redirects to /dashboard,
  // which would mislabel the dashboard's own violations as belonging to the signin/signup pages.
  const anonContext = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 2,
  });
  // LocaleSelectOverlay is a blocking, full-screen first-visit language chooser, shown whenever
  // `proman.locale.selected` is absent. A fresh Playwright context is always a "first visit", so
  // without this the signed-out surfaces were being measured underneath that overlay — the page's
  // own controls sat behind a z-[99999] scrim and the numbers described the chooser, not the page.
  // Presenting as a returning visitor measures the surface these routes actually serve.
  await anonContext.addInitScript(() => {
    try {
      localStorage.setItem("proman.locale.selected", "en");
    } catch {
      /* storage disabled — the overlay just shows, same as a real first visit */
    }
  });

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
    await bootstrap.waitForTimeout(2500);
  }

  const ids = await resolveIds(bootstrap);
  console.log("[audit] resolved ids:", ids);
  await bootstrap.close();

  const surfaces = ONLY ? SURFACES.filter((s) => s.id.includes(ONLY)) : SURFACES;
  const results = [];
  for (const surface of surfaces) {
    for (const theme of THEMES) {
      if (surface.path.includes("{")) {
        const key = surface.path.match(/\{(\w+)\}/)?.[1];
        if (key && !ids[key]) {
          console.log(`[audit] skip ${surface.id} (${theme}) — no ${key} available`);
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
    themes: THEMES,
  };
  writeFileSync(
    join(OUT_DIR, `report-${VIEWPORT_WIDTH}.json`),
    JSON.stringify({ meta, results }, null, 2),
  );
  writeFileSync(join(OUT_DIR, `report-${VIEWPORT_WIDTH}.md`), toMarkdown(results, meta));
  console.log(`\n[audit] wrote ${OUT_DIR}/report-${VIEWPORT_WIDTH}.{json,md}`);

  const overflowing = results.filter((r) => r.status !== "error" && r.pageOverflow > 0);
  console.log(`[audit] ${overflowing.length}/${results.length} surface-runs overflow horizontally`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
