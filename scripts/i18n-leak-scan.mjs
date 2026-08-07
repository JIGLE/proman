#!/usr/bin/env node
/**
 * Walk a set of surfaces in every locale and report rendered next-intl key paths.
 *
 * next-intl prints the key when a message is missing rather than returning undefined, so a
 * missing translation is silent — it renders as `leases.field.rent` and reads like debug text.
 * This is the only check that catches it. Static extraction can't: it sees the `t("…")` call
 * and assumes the catalog has the key.
 *
 * Because it works off `document.body.innerText`, it only sees what is actually on screen —
 * a key used solely in a dialog or a non-default view mode needs that state opened first, which
 * is what `--interact` does. Before trusting a clean run, prove the scan reaches the strings
 * you care about by removing one key and watching it get reported.
 *
 * Usage: node scripts/i18n-leak-scan.mjs <path...> [--interact]
 *   e.g. node scripts/i18n-leak-scan.mjs /leases /people --interact
 */
"use strict";

import { chromium } from "playwright";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
/** Empty means "let Playwright resolve its own install" — see the note in mobile-audit.mjs. */
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM ?? "";
const EMAIL = process.env.E2E_USER_EMAIL ?? "demo@proman.local";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "demo123";
const LOCALES = ["en", "pt", "es", "it"];

const args = process.argv.slice(2);
const interact = args.includes("--interact");
const paths = args.filter((a) => !a.startsWith("--"));
if (paths.length === 0) {
  console.error("usage: node scripts/i18n-leak-scan.mjs <path...> [--interact]");
  process.exit(2);
}

// Namespaces live at the catalog root, so a leaked key always starts with one of them.
const NAMESPACES = Object.keys(
  JSON.parse(await (await import("node:fs/promises")).readFile("messages/en.json", "utf8")),
);
// Case-insensitive on purpose. `innerText` reflects `text-transform`, and the Situs tab
// triggers and mono-labels are uppercase — a case-sensitive match read a leaked
// `reports.tabFinancial` as `REPORTS.TABFINANCIAL` and reported the surface clean.
const LEAK = new RegExp(
  `\\b(${NAMESPACES.join("|")})\\.[A-Za-z][A-Za-z0-9]*(\\.[A-Za-z][A-Za-z0-9]*)*\\b`,
  "gi",
);

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').waitFor({ state: "visible", timeout: 30000 });
await page.locator('input[name="email"]').fill(EMAIL);
await page.locator('input[name="password"]').fill(PASSWORD);
await page.locator('form button[type="submit"]').click();
await page.waitForURL(/\/(en|pt|es|it)(\/|$|\?)/, { timeout: 20000 });

async function collect(into) {
  for (const m of (await page.evaluate(() => document.body.innerText)).match(LEAK) || [])
    into.add(m.toLowerCase());
}

/**
 * Form dialogs hold a large share of a view's copy — every field label, placeholder and submit
 * verb — and none of it is in the DOM until the dialog opens. Open each create/add trigger,
 * read it, then close. Runs once per tab, because the trigger for a tab's own dialog does not
 * exist until that tab is active.
 */
async function sweepDialogs(into) {
  const openers = await page
    .locator("main button, header button")
    .filter({
      hasText: /add|new|create|adicionar|criar|novo|nova|añadir|nuevo|crear|aggiungi|crea/i,
    })
    .all();
  for (const opener of openers.slice(0, 4)) {
    if (!(await opener.isVisible().catch(() => false))) continue;
    await opener.click().catch(() => {});
    await page.waitForTimeout(900);
    if (await page.locator('[role="dialog"]').count()) {
      await collect(into);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  }
}

/** Open the states a plain page load leaves closed: the other view mode, tabs, dialogs. */
async function exercise(into) {
  for (const label of ["grid", "table", "list"]) {
    for (const b of await page.locator("button[aria-label], button[title]").all()) {
      const l = (
        (await b.getAttribute("aria-label")) ||
        (await b.getAttribute("title")) ||
        ""
      ).toLowerCase();
      if (l.includes(label)) {
        await b.click().catch(() => {});
        await page.waitForTimeout(500);
        await collect(into);
        break;
      }
    }
  }
  await sweepDialogs(into);

  // Re-query between clicks: activating a tab can mount a nested tab bar that did not exist
  // when the list was first captured, and a stale handle would skip it. Collect twice per
  // click so a panel that renders a frame late is still seen.
  const clicked = new Set();
  for (let pass = 0; pass < 3; pass++) {
    const tabs = await page.locator('[role="tab"]').all();
    let progressed = false;
    for (let i = 0; i < tabs.length; i++) {
      const id = `${pass === 0 ? "" : "n"}${await tabs[i].innerText().catch(() => i)}`;
      if (clicked.has(id)) continue;
      clicked.add(id);
      progressed = true;
      await tabs[i].click().catch(() => {});
      await page.waitForTimeout(600);
      await collect(into);
      await page.waitForTimeout(600);
      await collect(into);
      await sweepDialogs(into);
    }
    if (!progressed) break;
  }
}

let total = 0;
for (const path of paths) {
  for (const locale of LOCALES) {
    const found = new Set();
    await page.goto(`${BASE}/${locale}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await collect(found);
    if (interact) await exercise(found);
    total += found.size;
    console.log(`${locale}${path}: ${found.size ? [...found].join(", ") : "clean"}`);
  }
}

await browser.close();
console.log(total === 0 ? "\n✓ no leaked key paths" : `\n✖ ${total} leaked key paths`);
process.exit(total === 0 ? 0 : 1);
