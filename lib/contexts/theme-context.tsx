"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

import {
  DEFAULT_COUNTRY,
  isCountryCode,
  resolveThemeVars,
  type CountryCode,
} from "@/lib/design/country-themes";

/**
 * Situs country theme provider.
 *
 * Two independent axes, per the brand spec:
 *  - country  → logo role colours + the matched UI palette pair
 *  - mode     → "normal" | "dark" (or "system" to follow the OS)
 *
 * The country palette drives the Situs Portal logo authentically; the UI
 * accent is contrast-adjusted inside resolveThemeVars. Semantic status
 * colours never change with country or mode.
 */

type ThemeMode = "normal" | "dark" | "system";
type ResolvedMode = "normal" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedMode;
  country: CountryCode;
  setTheme: (mode: ThemeMode) => void;
  setCountry: (country: CountryCode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = "situs-mode";
const COUNTRY_STORAGE_KEY = "situs-country";
/** Pre-rebrand key — read once for migration, then superseded. */
const LEGACY_THEME_STORAGE_KEY = "proman-theme";

/** Map pre-Situs theme names (light/dark/dark-oled) onto the two Situs modes. */
function normalizeMode(value: string | null | undefined): ThemeMode | null {
  switch (value) {
    case "normal":
    case "light":
      return "normal";
    case "dark":
    case "dark-oled":
      return "dark";
    case "system":
      return "system";
    default:
      return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<ThemeMode>("normal");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedMode>("normal");
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [_mounted, setMounted] = useState(false);

  const getSystemMode = useCallback((): ResolvedMode => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "normal";
    }
    return "normal";
  }, []);

  const resolveMode = useCallback(
    (preference: ThemeMode): ResolvedMode =>
      preference === "system" ? getSystemMode() : preference,
    [getSystemMode],
  );

  // Apply country + mode to the document: data attributes for the static CSS,
  // inline vars (precomputed, contrast-checked) for non-default countries.
  const applyTheme = useCallback((nextCountry: CountryCode, resolved: ResolvedMode) => {
    const root = document.documentElement;

    root.setAttribute("data-country", nextCountry);
    root.setAttribute("data-mode", resolved);
    // Legacy hooks kept during the migration window: pre-Situs CSS/tests key
    // off .light/.dark classes and data-theme.
    root.classList.remove("light", "dark", "dark-oled");
    root.classList.add(resolved === "dark" ? "dark" : "light");
    root.setAttribute("data-theme", resolved === "dark" ? "dark" : "light");

    const vars = resolveThemeVars(nextCountry, resolved);
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }

    setResolvedTheme(resolved);
  }, []);

  // Initialize: local choice wins (instant, flash-free). Fresh browsers follow
  // the OS, then adopt the account's saved theme once /api/settings responds.
  useEffect(() => {
    const storedCountryRaw = localStorage.getItem(COUNTRY_STORAGE_KEY);
    const storedCountry =
      storedCountryRaw && isCountryCode(storedCountryRaw) ? storedCountryRaw : DEFAULT_COUNTRY;
    setCountryState(storedCountry);

  // Self-heal when the theme is changed outside this provider (e.g. demo mode
  // entry/exit writing localStorage directly, or another tab). Listening for
  // both the cross-tab `storage` event and a same-tab custom event keeps React
  // state, the DOM class, and localStorage in sync — the single source of truth.
  useEffect(() => {
    const sync = () => {
      const stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) || "light";
      setThemeState(stored);
      applyTheme(resolveTheme(stored));
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) sync();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("proman:theme-changed", sync);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("proman:theme-changed", sync);
    };
  }, [applyTheme, resolveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme(country, getSystemMode());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, country, applyTheme, getSystemMode]);

  const setTheme = useCallback(
    (newMode: ThemeMode) => {
      setThemeState(newMode);
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
      applyTheme(country, resolveMode(newMode));
    },
    [country, applyTheme, resolveMode],
  );

  const setCountry = useCallback(
    (newCountry: CountryCode) => {
      if (!isCountryCode(newCountry)) return;
      setCountryState(newCountry);
      localStorage.setItem(COUNTRY_STORAGE_KEY, newCountry);
      applyTheme(newCountry, resolveMode(theme));
    },
    [theme, applyTheme, resolveMode],
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "normal" ? "dark" : "normal");
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, country, setTheme, setCountry, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
