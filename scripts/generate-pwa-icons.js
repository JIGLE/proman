#!/usr/bin/env node
/**
 * Generates the Situs PWA raster icons from the Situs Portal logomark
 * (PT palette — raster icons can't follow the runtime country theme).
 *
 *   public/icon-192.png            — standard 192×192
 *   public/icon-512.png            — standard 512×512
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

// PT logo roles + logo canvas/keyline (see lib/design/country-themes.ts).
const PRIMARY = "#006600";
const SECONDARY = "#FF0000";
const ACCENT = "#FFFF00";
const CANVAS = "#F1E8D8";
const KEYLINE = "rgba(0,0,0,0.48)";

/** The Situs Portal, mapped from its canonical 100-unit viewBox into [inset, size-inset]. */
function portal(size, inset) {
  const s = (size - inset * 2) / 100;
  const t = (n) => inset + n * s;
  return `
    <circle cx="${t(50)}" cy="${t(50)}" r="${44 * s}" fill="${PRIMARY}" stroke="${KEYLINE}"
      stroke-width="${1.25 * s}" stroke-dasharray="${3 * s} ${3 * s}" opacity="0.35"/>
    <path d="M${t(20)} ${t(50)} C${t(20)} ${t(33.4)} ${t(33.4)} ${t(20)} ${t(50)} ${t(20)} C${t(66.6)} ${t(20)} ${t(80)} ${t(33.4)} ${t(80)} ${t(50)}"
      fill="none" stroke="${KEYLINE}" stroke-width="${15 * s}" stroke-linecap="round"/>
    <path d="M${t(20)} ${t(50)} C${t(20)} ${t(33.4)} ${t(33.4)} ${t(20)} ${t(50)} ${t(20)} C${t(66.6)} ${t(20)} ${t(80)} ${t(33.4)} ${t(80)} ${t(50)}"
      fill="none" stroke="${PRIMARY}" stroke-width="${12 * s}" stroke-linecap="round"/>
    <path d="M${t(20)} ${t(72)} H${t(80)}" stroke="${KEYLINE}" stroke-width="${11 * s}" stroke-linecap="round"/>
    <path d="M${t(20)} ${t(72)} H${t(80)}" stroke="${SECONDARY}" stroke-width="${8 * s}" stroke-linecap="round"/>
    <circle cx="${t(50)}" cy="${t(50)}" r="${12 * s}" fill="${ACCENT}" stroke="${KEYLINE}" stroke-width="${1.25 * s}"/>`;
}

function svg({ size, inset }) {
  // Rectilinear brand: square tile, flat logo canvas, no gradients, no rounding.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${CANVAS}"/>
  ${portal(size, inset)}
</svg>`;
}

async function render(name, options) {
  const buf = Buffer.from(svg(options));
  await sharp(buf).png().toFile(path.join(PUBLIC, name));
  console.log(`  ✓ ${name} (${options.size}×${options.size})`);
}

async function main() {
  if (!fs.existsSync(PUBLIC)) throw new Error(`public/ not found at ${PUBLIC}`);
  console.log("Generating Situs PWA icons…");
  // Standard icons: logo fills most of the tile.
  await render("icon-192.png", { size: 192, inset: 18 });
  await render("icon-512.png", { size: 512, inset: 48 });
  // Maskable: full-bleed bg, logo kept inside the ~80% safe zone.
  await render("icon-maskable-512.png", { size: 512, inset: 96 });
  // Apple touch icon: full-bleed (iOS rounds it itself).
  await render("apple-touch-icon.png", { size: 180, inset: 30 });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
