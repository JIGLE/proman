"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Play, X, ChevronDown, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemoMode } from "@/lib/contexts/demo-context";
import {
  SCENARIOS,
  runScenario,
  type ScenarioConfig,
  type ScenarioProgress,
} from "@/lib/demo/demo-scenarios";

export function ScenarioRunner() {
  const { isDemoMode } = useDemoMode();
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<ScenarioProgress | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  const handleRun = useCallback((scenario: ScenarioConfig) => {
    // Cancel any running scenario
    cancelRef.current?.();

    cancelRef.current = runScenario(scenario.steps, (p) => {
      setProgress(p);
      if (p.isComplete) {
        // Auto-dismiss after 3 seconds then reload to reflect changes
        setTimeout(() => {
          setProgress(null);
          setIsOpen(false);
          window.location.reload();
        }, 2000);
      }
    });
  }, []);

  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    setProgress(null);
  }, []);

  if (!isDemoMode) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] md:bottom-6">
      <AnimatePresence>
        {/* Scenario Menu */}
        {isOpen && !progress?.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-14 right-0 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Run Demo Scenario
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Watch a realistic workflow unfold
              </p>
            </div>
            <div className="p-2">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.name}
                  onClick={() => handleRun(scenario)}
                  className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {scenario.name}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 ml-5.5 pl-px">
                    {scenario.description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Progress Toast */}
        {progress?.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-14 right-0 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-text-primary)]">
                Running scenario...
              </span>
              <button
                onClick={handleCancel}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-[var(--color-primary)] animate-spin shrink-0" />
              <span className="text-xs text-[var(--color-text-secondary)] truncate">
                {progress.label}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
              <motion.div
                className="h-full bg-[var(--color-primary)] rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((progress.currentStep + 1) / progress.totalSteps) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
              Step {progress.currentStep + 1} of {progress.totalSteps}
            </span>
          </motion.div>
        )}

        {/* Completion Toast */}
        {progress?.isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-14 right-0 w-64 rounded-xl border border-green-500/30 bg-green-950/90 shadow-xl p-4"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              <span className="text-sm font-medium text-green-200">Scenario complete!</span>
            </div>
            <p className="text-xs text-green-300/70 mt-1">Refreshing to show updated data...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button — subtle outline style */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm px-3 py-2 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm hover:text-[var(--color-foreground)] hover:border-[var(--color-primary)]/50 transition-all"
        disabled={progress?.isRunning}
      >
        {progress?.isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">RunScenario</span>
        {isOpen && !progress?.isRunning && <ChevronDown className="h-3 w-3 ml-0.5" />}
      </motion.button>
    </div>
  );
}
