"use client";

import { useTranslations } from "next-intl";
import { useDemoMode } from "@/lib/contexts/demo-context";
import { AlertTriangle, LogOut, RotateCcw, Timer, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { resetDemoStore } from "@/lib/demo/demo-local-state";

const DEMO_DURATION_MS = 60 * 60 * 1000; // 1 hour
const EXTEND_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WARN_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY = "proman_demo_start";

function getTimeRemaining(): number {
  if (typeof window === "undefined") return DEMO_DURATION_MS;
  const start = sessionStorage.getItem(SESSION_KEY);
  if (!start) {
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    return DEMO_DURATION_MS;
  }
  const elapsed = Date.now() - parseInt(start, 10);
  return Math.max(0, DEMO_DURATION_MS - elapsed);
}

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Styling notes, since this bar sits above every screen and read as not-of-the-app.
 *
 * It used a raw `amber-500 → orange-500` gradient with `black/10` overlays and `amber-950` text.
 * None of that went through the token system, so it tracked neither theme nor the country accent,
 * and a gradient is the one decorative flourish this rectilinear brand uses nowhere else.
 * `--color-warning{,-foreground}` already exist in both themes and mean exactly this.
 *
 * Type was `text-[10px]` above `md` — under the 12px legibility floor globals.css sets out for
 * `.mono-label-xs` — and controls were `py-0.5`, nowhere near the 44px touch floor the mobile
 * rules require. Every label was hardcoded English in a four-locale product.
 */
export function DemoBanner() {
  const { isDemoMode, exitDemo, demoPerspective, switchDemoPerspective } = useDemoMode();
  const t = useTranslations();
  const [remaining, setRemaining] = useState(() => getTimeRemaining());
  const [collapsed, setCollapsed] = useState(false);
  const [showExtendPrompt, setShowExtendPrompt] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!isDemoMode) return;
    intervalRef.current = setInterval(() => {
      const r = getTimeRemaining();
      setRemaining(r);
      if (r <= WARN_THRESHOLD_MS && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
        setShowExtendPrompt(true);
      }
      if (r <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        exitDemo();
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDemoMode, exitDemo]);

  const handleReset = useCallback(() => {
    resetDemoStore();
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    setRemaining(DEMO_DURATION_MS);
    hasWarnedRef.current = false;
    setShowExtendPrompt(false);
    window.location.reload();
  }, []);

  const handleExtend = useCallback(() => {
    const start = sessionStorage.getItem(SESSION_KEY);
    if (start) {
      const newStart = parseInt(start, 10) + EXTEND_DURATION_MS;
      sessionStorage.setItem(SESSION_KEY, newStart.toString());
    }
    setRemaining((r) => Math.min(r + EXTEND_DURATION_MS, DEMO_DURATION_MS));
    hasWarnedRef.current = false;
    setShowExtendPrompt(false);
  }, []);

  if (!isDemoMode) return null;

  const isLowTime = remaining < WARN_THRESHOLD_MS;

  // One control style, shared. Flat, token-coloured, and tall enough to hit on a phone.
  const control =
    "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium " +
    "bg-[color-mix(in_srgb,var(--color-warning-foreground)_12%,transparent)] " +
    "hover:bg-[color-mix(in_srgb,var(--color-warning-foreground)_22%,transparent)] " +
    "transition-colors max-md:min-h-11";

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 border-b border-[color-mix(in_srgb,var(--color-warning-foreground)_25%,transparent)] bg-[var(--color-warning)] text-[var(--color-warning-foreground)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1">
        {/* Left: what this bar is, or just the clock once collapsed */}
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {collapsed ? (
            <span className="font-mono text-xs tabular-nums">{formatTime(remaining)}</span>
          ) : (
            <span className="truncate text-xs font-medium">{t("demo.banner")}</span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex shrink-0 items-center gap-1">
          {!collapsed && (
            <>
              <div
                role="group"
                aria-label={t("demo.perspectiveLabel")}
                className="inline-flex items-center bg-[color-mix(in_srgb,var(--color-warning-foreground)_12%,transparent)]"
              >
                {(["owner", "tenant"] as const).map((perspective) => (
                  <button
                    key={perspective}
                    type="button"
                    onClick={() => switchDemoPerspective(perspective)}
                    aria-pressed={demoPerspective === perspective}
                    className={`px-2 py-1 text-xs font-semibold transition-colors max-md:min-h-11 ${
                      demoPerspective === perspective
                        ? "bg-[color-mix(in_srgb,var(--color-warning-foreground)_28%,transparent)]"
                        : "hover:bg-[color-mix(in_srgb,var(--color-warning-foreground)_18%,transparent)]"
                    }`}
                  >
                    {t(
                      perspective === "owner" ? "demo.perspectiveOwner" : "demo.perspectiveTenant",
                    )}
                  </button>
                ))}
              </div>

              {/* Countdown. Below the warning threshold it inverts to the error token rather than
                  pulsing — a blinking element beside a countdown is noise, and animation here
                  would ignore prefers-reduced-motion. */}
              <span
                title={t("demo.timeRemaining")}
                className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-xs tabular-nums ${
                  isLowTime
                    ? "bg-[var(--color-error)] text-[var(--color-error-foreground)]"
                    : "bg-[color-mix(in_srgb,var(--color-warning-foreground)_12%,transparent)]"
                }`}
              >
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                {formatTime(remaining)}
                {isLowTime && <span className="sr-only">{t("demo.expiringSoon")}</span>}
              </span>

              {/* Extend appears only when it is needed. The old design showed this button AND a
                  second full-width red bar below with the same action — two prompts, one job. */}
              {(isLowTime || showExtendPrompt) && (
                <button
                  type="button"
                  onClick={handleExtend}
                  title={t("demo.extendTitle")}
                  className={control}
                >
                  {t("demo.extend")}
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                title={t("demo.resetTitle")}
                className={control}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("demo.reset")}</span>
              </button>

              <button type="button" onClick={exitDemo} className={control}>
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                {t("demo.exitButton")}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("demo.expand") : t("demo.collapse")}
            className="inline-flex items-center p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-warning-foreground)_18%,transparent)] max-md:min-h-11 max-md:min-w-11 max-md:justify-center"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
