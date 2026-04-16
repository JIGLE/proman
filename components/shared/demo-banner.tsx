"use client";

import { useTranslations } from "next-intl";
import { useDemoMode } from "@/lib/contexts/demo-context";
import { AlertTriangle, LogOut, RotateCcw, PlayCircle, Timer } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { resetDemoStore } from "@/lib/demo/demo-local-state";

const DEMO_DURATION_MS = 60 * 60 * 1000; // 1 hour
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

export function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemoMode();
  const t = useTranslations();
  const [remaining, setRemaining] = useState(() => getTimeRemaining());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isDemoMode) return;
    intervalRef.current = setInterval(() => {
      const r = getTimeRemaining();
      setRemaining(r);
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
    window.location.reload();
  }, []);

  const handleRestartTour = useCallback(() => {
    // Dispatch custom event that the guided tour component listens for
    window.dispatchEvent(new CustomEvent("proman:restart-tour"));
  }, []);

  if (!isDemoMode) return null;

  const isLowTime = remaining < 5 * 60 * 1000; // < 5 min

  return (
    <div
      data-tour="demo-banner"
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-amber-950 dark:from-amber-600/90 dark:to-orange-600/90 dark:text-amber-50 shadow-sm"
    >
      {/* Left: status */}
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{t("demo.banner")}</span>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Session timer */}
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono tabular-nums ${
            isLowTime
              ? "bg-red-900/30 text-red-100 animate-pulse"
              : "bg-amber-900/15 text-amber-950 dark:text-amber-100"
          }`}
          title="Time remaining in demo session"
        >
          <Timer className="h-3 w-3" />
          {formatTime(remaining)}
        </span>

        {/* Restart Tour */}
        <button
          onClick={handleRestartTour}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-amber-900/15 hover:bg-amber-900/25 transition-colors"
          title="Restart guided tour"
        >
          <PlayCircle className="h-3 w-3" />
          <span className="hidden sm:inline">Tour</span>
        </button>

        {/* Reset Demo */}
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-amber-900/15 hover:bg-amber-900/25 transition-colors"
          title="Reset demo data to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Exit Demo */}
        <button
          onClick={exitDemo}
          className="inline-flex items-center gap-1 rounded-md bg-amber-900/20 px-2.5 py-0.5 text-[10px] font-semibold hover:bg-amber-900/30 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          {t("demo.exitButton")}
        </button>
      </div>
    </div>
  );
}
