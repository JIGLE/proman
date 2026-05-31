"use client";

import { useTranslations } from "next-intl";
import { useDemoMode } from "@/lib/contexts/demo-context";
import {
  AlertTriangle,
  LogOut,
  RotateCcw,
  PlayCircle,
  Timer,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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

  const handleRestartTour = useCallback(() => {
    // Dispatch custom event that the guided tour component listens for
    window.dispatchEvent(new CustomEvent("proman:restart-tour"));
  }, []);

  if (!isDemoMode) return null;

  const isLowTime = remaining < WARN_THRESHOLD_MS;

  return (
    <div data-tour="demo-banner" role="status" aria-live="polite" className="sticky top-0 z-50">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-amber-950 dark:from-amber-600/90 dark:to-orange-600/90 dark:text-amber-50 shadow-sm transition-all duration-200">
        {/* Left: status */}
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="truncate">{t("demo.banner")}</span>}
          {collapsed && (
            <span className="text-[10px] font-mono tabular-nums">
              <Timer className="h-3 w-3 inline mr-1" />
              {formatTime(remaining)}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!collapsed && (
            <>
              <div className="inline-flex items-center gap-1 rounded bg-amber-900/15 p-0.5">
                <button
                  onClick={() => switchDemoPerspective("owner")}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    demoPerspective === "owner" ? "bg-amber-950/20" : ""
                  }`}
                >
                  Owner
                </button>
                <button
                  onClick={() => switchDemoPerspective("tenant")}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    demoPerspective === "tenant" ? "bg-amber-950/20" : ""
                  }`}
                >
                  Tenant
                </button>
              </div>

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

              {/* Extend 15 min — visible when < 5 min remain */}
              {isLowTime && (
                <button
                  onClick={handleExtend}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-amber-950/25 hover:bg-amber-950/40 transition-colors"
                  title="Extend demo by 15 minutes"
                >
                  +15 min
                </button>
              )}

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
            </>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center rounded p-0.5 hover:bg-amber-900/20 transition-colors"
            title={collapsed ? "Expand demo banner" : "Collapse demo banner"}
          >
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Expiry warning prompt row */}
      {showExtendPrompt && (
        <div className="flex items-center justify-between gap-2 bg-red-600/90 px-3 py-1 text-xs font-medium text-white shadow-sm">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Demo expires in 5 minutes. Extend?
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExtend}
              className="inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-[10px] font-semibold bg-white/20 hover:bg-white/30 transition-colors"
            >
              Extend 15 min
            </button>
            <button
              onClick={() => setShowExtendPrompt(false)}
              className="inline-flex items-center rounded p-0.5 hover:bg-white/20 transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
