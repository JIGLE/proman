#!/usr/bin/env node
/**
 * Generates the Lares PWA raster icons from the brand logomark.
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
const MARK = "#0b0e14";
const TEAL = "#14b8a6";
const TERRACOTTA = "#d97a53";

/** The Roman arch + keystone, in charcoal, scaled into a `size` viewBox. */
function arch(size, inset) {
  // Map the canonical 128-unit artwork into [inset, size-inset].
  const s = (size - inset * 2) / 128;
  const t = (n) => inset + n * s;
  const sw = 11 * s;
  return `
    <path d="M${t(42)} ${t(96)}V${t(60)}a${22 * s} ${22 * s} 0 0 1 ${44 * s} 0v${36 * s}"
      fill="none" stroke="${MARK}" stroke-width="${sw}" stroke-linecap="round"/>
    <rect x="${t(58)}" y="${t(30)}" width="${12 * s}" height="${16 * s}" rx="${3 * s}" fill="${MARK}"/>`;
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
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  ${arch(size, inset)}
</svg>`;
}

async function render(name, options) {
  const buf = Buffer.from(svg(options));
  await sharp(buf).png().toFile(path.join(PUBLIC, name));
  console.log(`  ✓ ${name} (${options.size}×${options.size})`);
}

async function main() {
  if (!fs.existsSync(PUBLIC)) throw new Error(`public/ not found at ${PUBLIC}`);
  console.log("Generating Lares PWA icons…");
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
