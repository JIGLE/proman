#!/usr/bin/env node
/**
 * Generates the Domora PWA raster icons from the brand logomark.
 *
 *   public/icon-192.png            — standard 192×192 (rounded)
 *   public/icon-512.png            — standard 512×512 (rounded)
 *   public/icon-maskable-512.png   — full-bleed, logo in the 80% safe zone
 *   public/apple-touch-icon.png    — 180×180 full-bleed (iOS applies its mask)
 *
 * Run: npm run pwa:icons   (or: node scripts/generate-pwa-icons.js)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PUBLIC = path.resolve(__dirname, "..", "public");
const BG = "#0b0e14";
const TEAL = "#0d9488";
const TERRACOTTA = "#e8825a";

/** The arched-doorway mark, scaled/positioned within a `size` viewBox. */
function doorway(size, inset) {
  // Map the canonical 128-unit artwork into [inset, size-inset].
  const s = (size - inset * 2) / 128;
  const t = (n) => inset + n * s;
  const sw = 12 * s;
  return `
    <path d="M${t(40)} ${t(100)}V${t(58)}a${24 * s} ${24 * s} 0 0 1 ${48 * s} 0v${42 * s}"
      fill="none" stroke="url(#g)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${t(33)} ${t(100)}h${62 * s}" fill="none" stroke="url(#g)" stroke-width="${sw}" stroke-linecap="round"/>
    <circle cx="${t(64)}" cy="${t(61)}" r="${7 * s}" fill="url(#g)"/>`;
}

function svg({ size, rounded, inset }) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${TERRACOTTA}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  ${doorway(size, inset)}
</svg>`;
}

async function render(name, options) {
  const buf = Buffer.from(svg(options));
  await sharp(buf).png().toFile(path.join(PUBLIC, name));
  console.log(`  ✓ ${name} (${options.size}×${options.size})`);
}

async function main() {
  if (!fs.existsSync(PUBLIC)) throw new Error(`public/ not found at ${PUBLIC}`);
  console.log("Generating Domora PWA icons…");
  // Standard icons: rounded panel, logo fills most of the tile.
  await render("icon-192.png", { size: 192, rounded: true, inset: 18 });
  await render("icon-512.png", { size: 512, rounded: true, inset: 48 });
  // Maskable: full-bleed bg, logo kept inside the ~80% safe zone.
  await render("icon-maskable-512.png", { size: 512, rounded: false, inset: 96 });
  // Apple touch icon: full-bleed (iOS rounds it itself).
  await render("apple-touch-icon.png", { size: 180, rounded: false, inset: 30 });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
