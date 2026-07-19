#!/usr/bin/env node
/**
 * Assistive migration of hardcoded neutral Tailwind literals (zinc/…) to Lares
 * design tokens, for driving down the `check-color-tokens.js` ratchet. Neutral
 * literals don't remap per theme, so they break the light & OLED themes; this
 * maps them to the semantic `var(--color-*)` tokens defined in app/globals.css.
 *
 *   node scripts/migrate-neutral-tokens.mjs <file...>
 *
 * NOT a blind find/replace to trust unreviewed: the neutral→token mapping is
 * contextual (a `bg-zinc-900` can be a card, a popover, or a well). Always
 * eyeball the diff and re-capture the screen in all three themes
 * (scripts/design-capture.mjs) before committing. See docs/DESIGN_AWARD.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
// Ordered [from,to] — most-specific (opacity/hover variants) first.
const MAP = [
  ["hover:bg-zinc-800/50", "hover:bg-[var(--color-surface-hover)]"],
  ["hover:bg-zinc-800/40", "hover:bg-[var(--color-surface-hover)]"],
  ["hover:bg-zinc-700", "hover:bg-[var(--color-surface-hover)]"],
  ["hover:text-zinc-200", "hover:text-[var(--color-foreground)]"],
  ["hover:text-zinc-100", "hover:text-[var(--color-foreground)]"],
  ["hover:border-zinc-500", "hover:border-[var(--color-border-hover)]"],
  ["hover:border-zinc-700", "hover:border-[var(--color-border-hover)]"],
  ["bg-zinc-800/40", "bg-[var(--color-surface-hover)]"],
  ["bg-zinc-800/50", "bg-[var(--color-surface-hover)]"],
  ["bg-zinc-800/60", "bg-[var(--color-surface-pressed)]"],
  ["bg-zinc-900/60", "bg-[var(--color-card)]"],
  ["bg-zinc-900/80", "bg-[var(--color-card)]"],
  ["bg-zinc-950/50", "bg-[var(--color-muted)]/30"],
  ["bg-zinc-950", "bg-[var(--color-background)]"],
  ["bg-zinc-900", "bg-[var(--color-card-solid)]"],
  ["bg-zinc-800", "bg-[var(--color-popover)]"],
  ["border-zinc-800", "border-[var(--color-border)]"],
  ["border-zinc-700", "border-[var(--color-border)]"],
  ["border-zinc-600", "border-[var(--color-border)]"],
  ["divide-zinc-800", "divide-[var(--color-border)]"],
  ["text-zinc-100", "text-[var(--color-foreground)]"],
  ["text-zinc-200", "text-[var(--color-foreground)]"],
  ["text-zinc-300", "text-[var(--color-muted-foreground)]"],
  ["text-zinc-400", "text-[var(--color-muted-foreground)]"],
  ["text-zinc-500", "text-[var(--color-muted-foreground)]"],
  ["text-zinc-600", "text-[var(--color-muted-foreground)]"],
];
for (const file of process.argv.slice(2)) {
  let s = readFileSync(file, "utf8");
  let n = 0;
  for (const [from, to] of MAP) {
    const parts = s.split(from);
    n += parts.length - 1;
    s = parts.join(to);
  }
  writeFileSync(file, s);
  console.log(`${file}: ${n} replacements`);
}
