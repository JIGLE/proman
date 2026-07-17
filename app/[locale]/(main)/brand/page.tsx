import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { SitusPortalMark } from "@/components/shared/situs-portal-logo";
import {
  COUNTRY_CODES,
  COUNTRY_THEMES,
  contrastRatio,
  resolveThemeVars,
  type ThemeMode,
} from "@/lib/design/country-themes";

export const dynamic = "force-dynamic";

/**
 * Internal dev/admin reference: the Situs Portal logo + country theme table,
 * one row per country roles.note explains the flag-colour mapping. Never
 * linked from the nav rail (lib/portal/access.ts keeps it as a hidden entry
 * so the guard permits the direct URL) and 404s outside development so it
 * never ships as a real product surface.
 */
export default function BrandPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Situs Brand Reference</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Internal dev/admin reference — the Situs Portal logo re-themed per country, and the
          normal/dark UI palette each one resolves to. Not linked from the app nav; dev-only.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COUNTRY_CODES.map((code) => {
          const entry = COUNTRY_THEMES[code];
          return (
            <div key={code} className="border border-[var(--color-border)] p-4">
              <p className="mono-label">{code}</p>
              <p className="mb-3 text-lg font-light text-[var(--color-foreground)]">{entry.name}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["normal", "dark"] as ThemeMode[]).map((mode) => {
                  const vars = resolveThemeVars(code, mode);
                  const theme = mode === "dark" ? entry.dark : entry.normal;
                  const ratio = contrastRatio(vars["--ui-accent"], theme.canvas);
                  const highlightRatio = contrastRatio(
                    vars["--country-highlight-readable"],
                    theme.canvas,
                  );
                  return (
                    <div
                      key={mode}
                      style={vars as CSSProperties}
                      className="flex flex-col items-center gap-2 border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"
                    >
                      <p className="mono-label-xs">{mode}</p>
                      <SitusPortalMark size="sm" />
                      <p className="text-[10px] text-[var(--color-ink)]">
                        accent {ratio.toFixed(2)}:1
                      </p>
                      <p className="text-[10px] text-[var(--color-ink)]">
                        readable {highlightRatio.toFixed(2)}:1
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                {entry.roles.note}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
