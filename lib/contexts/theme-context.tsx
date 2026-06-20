"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "dark-oled" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark" | "dark-oled";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "proman-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | "dark-oled">("light");
  const [_mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  }, []);

  // Resolve the actual theme based on preference
  const resolveTheme = useCallback(
    (themePreference: Theme): "light" | "dark" | "dark-oled" => {
      if (themePreference === "system") {
        return getSystemTheme();
      }
      return themePreference;
    },
    [getSystemTheme],
  );

  // Apply theme to document
  const applyTheme = useCallback((resolved: "light" | "dark" | "dark-oled") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "dark-oled");
    root.classList.add(resolved);
    root.setAttribute("data-theme", resolved);
    setResolvedTheme(resolved);
  }, []);

  // Initialize theme from storage
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const initialTheme = stored || "light";
    setThemeState(initialTheme);
    applyTheme(resolveTheme(initialTheme));
    setMounted(true);
  }, [applyTheme, resolveTheme]);

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
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme, getSystemTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      applyTheme(resolveTheme(newTheme));
    },
    [applyTheme, resolveTheme],
  );

  const toggleTheme = useCallback(() => {
    // Cycle through: light → dark → dark-oled → light
    const themeOrder: Array<"light" | "dark" | "dark-oled"> = ["light", "dark", "dark-oled"];
    const currentIndex = themeOrder.indexOf(resolvedTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
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
