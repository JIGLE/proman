import { describe, expect, it } from "vitest";

import {
  COUNTRY_CODES,
  COUNTRY_THEMES,
  DEFAULT_COUNTRY,
  SEMANTIC_TOKENS,
  contrastRatio,
  hexToRgba,
  isCountryCode,
  isDark,
  mixWith,
  readableHighlight,
  resolveThemeVars,
  type ThemeMode,
} from "./country-themes";

const MODES: ThemeMode[] = ["normal", "dark"];
const HEX = /^#[0-9A-F]{6}$/i;

describe("country-themes color math", () => {
  it("computes WCAG contrast (black vs white = 21)", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("mixWith interpolates toward the target", () => {
    expect(mixWith("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    expect(mixWith("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mixWith("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("classifies dark canvases", () => {
    expect(isDark("#0B110D")).toBe(true);
    expect(isDark("#F6F0E4")).toBe(false);
  });

  it("converts hex to rgba", () => {
    expect(hexToRgba("#FF0000", 0.08)).toBe("rgba(255, 0, 0, 0.08)");
  });
});

describe("country table integrity", () => {
  it("contains all 27 EU member palettes plus the EU itself", () => {
    expect(COUNTRY_CODES).toHaveLength(28);
    expect(COUNTRY_CODES).toContain("EU");
    expect(COUNTRY_CODES).toContain(DEFAULT_COUNTRY);
  });

  it.each(COUNTRY_CODES)("%s has valid hex logo roles and a mapping note", (code) => {
    const { roles } = COUNTRY_THEMES[code];
    expect(roles.primary).toMatch(HEX);
    expect(roles.secondary).toMatch(HEX);
    expect(roles.accent).toMatch(HEX);
    expect(roles.neutral).toMatch(HEX);
    expect(roles.note.length).toBeGreaterThan(10);
  });

  it("keeps flag colours authentic for the spec's reference countries", () => {
    // Spec examples: logo colours are real flag colours mapped by role.
    expect(COUNTRY_THEMES.PT.roles).toMatchObject({
      primary: "#006600",
      secondary: "#FF0000",
      accent: "#FFFF00",
    });
    expect(COUNTRY_THEMES.ES.roles).toMatchObject({
      primary: "#AA151B",
      secondary: "#AA151B",
      accent: "#F1BF00",
    });
    expect(COUNTRY_THEMES.DE.roles).toMatchObject({
      primary: "#000000",
      secondary: "#DD0000",
      accent: "#FFCE00",
    });
    expect(COUNTRY_THEMES.EU.roles).toMatchObject({
      primary: "#003399",
      secondary: "#003399",
      accent: "#FFCC00",
    });
    // Bicolour flags keep only their two real colours (dot falls back to white).
    expect(COUNTRY_THEMES.PL.roles.accent).toBe("#FFFFFF");
    expect(COUNTRY_THEMES.FI.roles.accent).toBe("#FFFFFF");
  });
});

describe("readable highlight guarantee", () => {
  it.each(COUNTRY_CODES.flatMap((code) => MODES.map((mode) => [code, mode] as const)))(
    "%s / %s UI highlight reaches 4.5:1 against its canvas",
    (code, mode) => {
      const theme = mode === "dark" ? COUNTRY_THEMES[code].dark : COUNTRY_THEMES[code].normal;
      const highlight = readableHighlight(COUNTRY_THEMES[code].roles.primary, theme.canvas);
      expect(contrastRatio(highlight, theme.canvas)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("leaves already-readable colours untouched (logo authenticity)", () => {
    // PT green on the light PT canvas is already >= 4.5:1 — must pass through unchanged.
    expect(readableHighlight("#006600", "#F6F0E4")).toBe("#006600");
  });

  it("adjusts unreadable colours instead of failing (e.g. yellow on white)", () => {
    const adjusted = readableHighlight("#FFFF00", "#FFFFFF");
    expect(adjusted).not.toBe("#FFFF00");
    expect(contrastRatio(adjusted, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("resolveThemeVars", () => {
  it.each(COUNTRY_CODES)("%s resolves a complete var map in both modes", (code) => {
    for (const mode of MODES) {
      const vars = resolveThemeVars(code, mode);
      expect(vars["--color-canvas"]).toMatch(HEX);
      expect(vars["--color-ink"]).toMatch(HEX);
      expect(vars["--logo-primary"]).toBe(COUNTRY_THEMES[code].roles.primary);
      expect(vars["--logo-accent"]).toBe(COUNTRY_THEMES[code].roles.accent);
      // Ink must always be readable on canvas — the base readability contract.
      expect(contrastRatio(vars["--color-ink"], vars["--color-canvas"])).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrastRatio(vars["--country-highlight-readable"], vars["--color-canvas"]),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps semantic tokens identical across countries and modes", () => {
    for (const code of COUNTRY_CODES) {
      for (const mode of MODES) {
        const vars = resolveThemeVars(code, mode);
        for (const [token, value] of Object.entries(SEMANTIC_TOKENS)) {
          expect(vars[token]).toBe(value);
        }
      }
    }
  });

  it.each(COUNTRY_CODES)("%s semantic text variants reach 4.5:1 in both modes", (code) => {
    for (const mode of MODES) {
      const vars = resolveThemeVars(code, mode);
      for (const key of ["success", "warning", "danger", "info"] as const) {
        expect(
          contrastRatio(vars[`--semantic-${key}-readable`], vars["--color-canvas"]),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keyline flips with logo canvas darkness", () => {
    expect(resolveThemeVars("PT", "normal")["--logo-keyline"]).toBe("rgba(0,0,0,0.48)");
    expect(resolveThemeVars("PT", "dark")["--logo-keyline"]).toBe("rgba(255,255,255,0.68)");
  });
});

describe("isCountryCode", () => {
  it("accepts known codes and rejects junk", () => {
    expect(isCountryCode("PT")).toBe(true);
    expect(isCountryCode("EU")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
    expect(isCountryCode("__proto__")).toBe(false);
  });
});
