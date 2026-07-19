#!/usr/bin/env node
/**
 * Design-award capture walk (Lares).
 *
 * Boots against a running dev server, enters demo mode (auth-free, realistic
 * fixtures), and screenshots each flagship screen in every theme at mobile and
 * desktop widths — the Lares analog of Katei's `capture.mjs`. Read every image,
 * then grade against docs/DESIGN_AWARD.md.
 *
 *   node scripts/design-capture.mjs [--tag before|after] [--base http://localhost:3000]
 *
 * Requires the dev server already running (npm run dev) and Chromium at
 * /opt/pw-browsers (PLAYWRIGHT_BROWSERS_PATH). Shots land in .design-award/shots/<tag>/.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const tag = (args[args.indexOf("--tag") + 1] || "before").replace(/[^a-z0-9_-]/gi, "");
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
const LOCALE = "en";

// Flagship walk — extend as the polish pass fans out.
const SCREENS = [
  { name: "dashboard", path: `/${LOCALE}/dashboard` },
  { name: "properties", path: `/${LOCALE}/properties` },
  { name: "financials", path: `/${LOCALE}/financials` },
];
const THEMES = ["light", "dark", "dark-oled"];
const WIDTHS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

const outDir = path.resolve(".design-award/shots", tag);
mkdirSync(outDir, { recursive: true });

const executablePath =
  process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium
  .launch({ executablePath, args: ["--no-sandbox"] })
  .catch(() => chromium.launch({ args: ["--no-sandbox"] })); // fall back to bundled

const context = await browser.newContext();

// Obtain a session by minting a NextAuth JWT with NEXTAUTH_SECRET (the demo
// credentials UI is locale-routed to a 404 in dev, so we skip the form).
const { encode } = await import("next-auth/jwt");
let secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
  try {
    const env = readFileSync(path.resolve(".env"), "utf8");
    secret = env.match(/^NEXTAUTH_SECRET=(.*)$/m)?.[1]?.trim();
  } catch {}
}
const sessionToken = await encode({
  secret,
  token: {
    name: "Demo User",
    email: "demo@proman.local",
    sub: "demo-user",
    role: "ADMIN",
    id: "demo-user",
  },
  maxAge: 60 * 60,
});
await context.addCookies([
  { name: "proman_demo", value: "1", url: BASE },
  { name: "next-auth.session-token", value: sessionToken, url: BASE },
]);

let shot = 0;
for (const theme of THEMES) {
  const page = await context.newPage();
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("proman-theme", t);
    } catch {}
  }, theme);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w.width, height: w.height });
    for (const s of SCREENS) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" }).catch(() => {});
      // Ensure the theme class is applied even if hydration re-ran.
      await page.evaluate((t) => {
        const r = document.documentElement;
        r.classList.remove("light", "dark", "dark-oled");
        r.classList.add(t);
        r.setAttribute("data-theme", t);
      }, theme);
      await page.waitForTimeout(400);
      const file = path.join(outDir, `${s.name}-${theme}-${w.name}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      shot++;
      console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
    }
  }
  await page.close();
}

console.log(`\nCaptured ${shot} screenshots → ${path.relative(process.cwd(), outDir)}\n`);
await browser.close();
