"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Title shown in the popover */
  title: string;
  /** Description shown in the popover */
  description: string;
  /** Preferred placement relative to target */
  placement?: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  steps: TourStep[];
  /** Called when the tour finishes or is dismissed */
  onComplete: () => void;
  /** SessionStorage key to mark tour as seen */
  storageKey?: string;
}

interface PopoverPosition {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right";
}

function getPopoverPosition(
  rect: DOMRect,
  placement: TourStep["placement"] = "bottom",
): PopoverPosition {
  const OFFSET = 12;
  const POPOVER_WIDTH = 320;

  switch (placement) {
    case "top":
      return {
        top: rect.top - OFFSET,
        left: rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
        arrowSide: "bottom",
      };
    case "left":
      return {
        top: rect.top + rect.height / 2 - 60,
        left: rect.left - POPOVER_WIDTH - OFFSET,
        arrowSide: "right",
      };
    case "right":
      return {
        top: rect.top + rect.height / 2 - 60,
        left: rect.right + OFFSET,
        arrowSide: "left",
      };
    case "bottom":
    default:
      return {
        top: rect.bottom + OFFSET,
        left: rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
        arrowSide: "top",
      };
  }
}

export function GuidedTour({
  steps,
  onComplete,
  storageKey = "proman_tour_seen",
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Check if tour was already completed
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(storageKey);
    if (!seen) {
      // Small delay so page renders first
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  // Listen for restart-tour events
  useEffect(() => {
    function handleRestart() {
      sessionStorage.removeItem(storageKey);
      setCurrentStep(0);
      setIsActive(true);
    }
    window.addEventListener("proman:restart-tour", handleRestart);
    return () => window.removeEventListener("proman:restart-tour", handleRestart);
  }, [storageKey]);

  // Position the popover on the current step's target
  const positionPopover = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;
    const step = steps[currentStep];
    const el = document.querySelector(step.target);
    if (!el) {
      // Target not found — skip step
      if (currentStep < steps.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        finish();
      }
      return;
    }
    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);
    setPosition(getPopoverPosition(rect, step.placement));
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    positionPopover();
    // Reposition on scroll/resize
    const handler = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(positionPopover);
    };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
      cancelAnimationFrame(rafRef.current);
    };
  }, [positionPopover]);

  const finish = useCallback(() => {
    setIsActive(false);
    sessionStorage.setItem(storageKey, "1");
    onComplete();
  }, [storageKey, onComplete]);

  // Auto-dismiss tour after 15 seconds of inactivity to avoid blocking the experience
  useEffect(() => {
    if (!isActive) return;
    const autoDismiss = setTimeout(() => {
      finish();
    }, 15000);
    return () => clearTimeout(autoDismiss);
  }, [isActive, currentStep, finish]);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, steps.length, finish]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  if (!isActive || !position || !highlightRect) return null;

  const step = steps[currentStep];
  const PADDING = 8;

  return (
    <>
      {/* Non-blocking overlay with highlight cutout — clicks pass through */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.35)",
          maskImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='${window.innerWidth}' height='${window.innerHeight}'><rect width='100%' height='100%' fill='white'/><rect x='${highlightRect.left - PADDING}' y='${highlightRect.top - PADDING}' width='${highlightRect.width + PADDING * 2}' height='${highlightRect.height + PADDING * 2}' rx='8' fill='black'/></svg>`,
          )}")`,
          WebkitMaskImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='${window.innerWidth}' height='${window.innerHeight}'><rect width='100%' height='100%' fill='white'/><rect x='${highlightRect.left - PADDING}' y='${highlightRect.top - PADDING}' width='${highlightRect.width + PADDING * 2}' height='${highlightRect.height + PADDING * 2}' rx='8' fill='black'/></svg>`,
          )}")`,
        }}
      />

      {/* Highlight border ring */}
      <div
        className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-transparent transition-all duration-300"
        style={{
          top: highlightRect.top - PADDING,
          left: highlightRect.left - PADDING,
          width: highlightRect.width + PADDING * 2,
          height: highlightRect.height + PADDING * 2,
        }}
      />

      {/* Popover */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[10000] w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl"
          style={{
            top: position.top,
            left: Math.max(8, Math.min(position.left, window.innerWidth - 328)),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={finish}
            className="absolute right-2 top-2 rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
            aria-label="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Content */}
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] pr-6">
            {step.title}
          </h3>
          <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {step.description}
          </p>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {currentStep + 1} / {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prev}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </>
                ) : (
                  "Finish"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
