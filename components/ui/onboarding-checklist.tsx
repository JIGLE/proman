"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  DollarSign,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/utils";

const CHECKLIST_DISMISSED_KEY = "proman.onboarding.checklist.dismissed";
const CHECKLIST_COLLAPSED_KEY = "proman.onboarding.checklist.collapsed";

export interface OnboardingChecklistStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
  actionLabel?: string;
}

interface OnboardingChecklistProps {
  steps: OnboardingChecklistStep[];
  className?: string;
  /** Called when user dismisses the checklist */
  onDismiss?: () => void;
  /** Called when all steps are complete */
  onAllComplete?: () => void;
}

export function OnboardingChecklist({
  steps,
  className,
  onDismiss,
  onAllComplete,
}: OnboardingChecklistProps): React.ReactElement | null {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [celebrateComplete, setCelebrateComplete] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true");
      setCollapsed(localStorage.getItem(CHECKLIST_COLLAPSED_KEY) === "true");
    } catch {
      // Ignore
    }
  }, []);

  const completedCount = useMemo(
    () => steps.filter((s) => s.completed).length,
    [steps]
  );
  const totalSteps = steps.length;
  const allComplete = completedCount === totalSteps;
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  // Trigger celebration when all complete
  useEffect(() => {
    if (allComplete && !celebrateComplete) {
      setCelebrateComplete(true);
      onAllComplete?.();
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, celebrateComplete, onAllComplete]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    } catch {
      // Ignore
    }
    onDismiss?.();
  }, [onDismiss]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CHECKLIST_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  if (dismissed) return null;

  // Find the first incomplete step to highlight
  const nextStep = steps.find((s) => !s.completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
        onClick={handleToggleCollapse}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleCollapse();
          }
        }}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              {allComplete ? "🎉 Setup Complete!" : "Getting Started"}
            </h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {allComplete
                ? "You're all set to manage your properties"
                : `${completedCount} of ${totalSteps} steps complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  step.completed
                    ? "bg-[var(--color-success)]"
                    : "bg-[var(--color-muted)]"
                )}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            title="Dismiss"
            aria-label="Dismiss setup checklist"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--color-muted)]">
        <motion.div
          className="h-full bg-[var(--color-success)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Steps */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {allComplete ? (
              /* Completion state */
              <div className="p-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-success)]/20 mb-3"
                >
                  <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
                </motion.div>
                <p className="text-sm text-[var(--color-foreground)] font-medium">
                  You&apos;re all set!
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Your property management dashboard is ready to use.
                </p>
              </div>
            ) : (
              /* Step list */
              <div className="p-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isNext = nextStep?.id === step.id;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        isNext
                          ? "bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20"
                          : "hover:bg-[var(--color-surface-hover)]"
                      )}
                    >
                      {/* Status icon */}
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] flex-shrink-0" />
                      ) : (
                        <Circle
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isNext
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-muted-foreground)]"
                          )}
                        />
                      )}

                      {/* Step info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            step.completed
                              ? "text-[var(--color-muted-foreground)] line-through"
                              : "text-[var(--color-foreground)]"
                          )}
                        >
                          {step.label}
                        </p>
                        {isNext && (
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                            {step.description}
                          </p>
                        )}
                      </div>

                      {/* Action button for next step */}
                      {isNext && step.action && (
                        <Button
                          size="sm"
                          onClick={step.action}
                          className="gap-1.5 text-xs shrink-0"
                        >
                          {step.actionLabel || "Start"}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Default onboarding steps factory */
export function getDefaultOnboardingSteps(config: {
  hasProperties: boolean;
  hasTenants: boolean;
  hasPayments: boolean;
  onAddProperty?: () => void;
  onAddTenant?: () => void;
  onRecordPayment?: () => void;
}): OnboardingChecklistStep[] {
  return [
    {
      id: "property",
      label: "Add your first property",
      description:
        "Start by adding a property — apartment, house, or commercial building.",
      completed: config.hasProperties,
      icon: Building2,
      action: config.onAddProperty,
      actionLabel: "Add Property",
    },
    {
      id: "tenant",
      label: "Add a tenant",
      description:
        "Add tenant details and assign them to a property.",
      completed: config.hasTenants,
      icon: Users,
      action: config.onAddTenant,
      actionLabel: "Add Tenant",
    },
    {
      id: "payment",
      label: "Record a payment",
      description:
        "Log your first rent payment to unlock revenue analytics.",
      completed: config.hasPayments,
      icon: DollarSign,
      action: config.onRecordPayment,
      actionLabel: "Record Payment",
    },
  ];
}
