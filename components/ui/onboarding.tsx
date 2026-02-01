"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Users, 
  Home, 
  Receipt, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  X,
  Sparkles
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  currentStep?: number;
}

const defaultSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to ProMan!",
    description: "Let's get your property management setup ready in just a few steps.",
    icon: <Sparkles className="h-8 w-8 text-accent-primary" />,
  },
  {
    id: "property",
    title: "Add Your First Property",
    description: "Start by adding a property to manage. You can add apartments, houses, or commercial buildings.",
    icon: <Building2 className="h-8 w-8 text-[var(--color-info)]" />,
  },
  {
    id: "units",
    title: "Set Up Your Units",
    description: "Divide your property into units. Each unit can have its own rent, lease, and tenant.",
    icon: <Home className="h-8 w-8 text-[var(--color-success)]" />,
  },
  {
    id: "tenants",
    title: "Add Tenants",
    description: "Add tenant information including contact details and lease terms.",
    icon: <Users className="h-8 w-8 text-[var(--color-warning)]" />,
  },
  {
    id: "payments",
    title: "Track Payments",
    description: "Record rent payments and generate receipts automatically.",
    icon: <DollarSign className="h-8 w-8 text-[var(--color-success)]" />,
  },
];

/**
 * Full-screen onboarding wizard for first-time users
 */
export function OnboardingWizard({ 
  onComplete, 
  onSkip,
  currentStep = 0 
}: OnboardingProps): React.ReactElement {
  const [step, setStep] = useState(currentStep);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (step < defaultSteps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const currentStepData = defaultSteps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-background)]">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-[var(--color-info)]/5" />
      
      {/* Skip button */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="relative w-full max-w-lg mx-4">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {defaultSteps.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === step 
                  ? "w-8 bg-accent-primary" 
                  : index < step 
                  ? "w-2 bg-accent-primary/60"
                  : "w-2 bg-[var(--color-muted)]"
              )}
              initial={false}
              animate={{ scale: index === step ? 1 : 0.8 }}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl"
          >
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="p-4 rounded-2xl bg-[var(--color-hover)] mb-6"
              >
                {currentStepData.icon}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold text-[var(--color-foreground)] mb-3"
              >
                {currentStepData.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[var(--color-muted-foreground)] mb-8 leading-relaxed"
              >
                {currentStepData.description}
              </motion.p>

              {/* Navigation buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-3 w-full"
              >
                {step > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={cn(
                    "flex-1 bg-accent-primary hover:bg-accent-primary/90",
                    step === 0 && "w-full"
                  )}
                >
                  {step === defaultSteps.length - 1 ? (
                    <>
                      Get Started
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step counter */}
        <p className="text-center text-sm text-[var(--color-muted-foreground)] mt-4">
          Step {step + 1} of {defaultSteps.length}
        </p>
      </div>
    </div>
  );
}

/**
 * Setup checklist component for dashboard
 */
interface SetupChecklistProps {
  onItemClick: (itemId: string) => void;
  completedItems?: string[];
  onDismiss?: () => void;
}

export function SetupChecklist({ 
  onItemClick,
  completedItems = [],
  onDismiss
}: SetupChecklistProps): React.ReactElement {
  const checklistItems = [
    {
      id: "property",
      title: "Add your first property",
      description: "Create a property to start managing",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      id: "unit",
      title: "Create a unit",
      description: "Add units to your property",
      icon: <Home className="h-5 w-5" />,
    },
    {
      id: "tenant",
      title: "Add a tenant",
      description: "Register your first tenant",
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "receipt",
      title: "Record a payment",
      description: "Track your first rent payment",
      icon: <Receipt className="h-5 w-5" />,
    },
  ];

  const completedCount = completedItems.length;
  const totalCount = checklistItems.length;
  const progress = (completedCount / totalCount) * 100;

  if (completedCount === totalCount) {
    return <></>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[var(--color-foreground)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            Getting Started
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Complete these steps to set up your account
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[var(--color-muted-foreground)]">Progress</span>
          <span className="font-medium text-[var(--color-foreground)]">{completedCount}/{totalCount}</span>
        </div>
        <div className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {checklistItems.map((item) => {
          const isCompleted = completedItems.includes(item.id);
          return (
            <motion.button
              key={item.id}
              onClick={() => !isCompleted && onItemClick(item.id)}
              disabled={isCompleted}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                isCompleted
                  ? "bg-[var(--color-success)]/10 cursor-default"
                  : "hover:bg-[var(--color-hover)] cursor-pointer"
              )}
              whileHover={!isCompleted ? { scale: 1.01 } : {}}
              whileTap={!isCompleted ? { scale: 0.99 } : {}}
            >
              <div
                className={cn(
                  "p-2 rounded-lg",
                  isCompleted
                    ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                    : "bg-[var(--color-hover)] text-[var(--color-muted-foreground)]"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  item.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted
                      ? "text-[var(--color-success)] line-through"
                      : "text-[var(--color-foreground)]"
                  )}
                >
                  {item.title}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                  {item.description}
                </p>
              </div>
              {!isCompleted && (
                <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)] flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Feature tooltip for contextual onboarding
 */
interface FeatureTooltipProps {
  title: string;
  description: string;
  isVisible: boolean;
  onDismiss: () => void;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function FeatureTooltip({
  title,
  description,
  isVisible,
  onDismiss,
  position = "bottom",
  children,
}: FeatureTooltipProps): React.ReactElement {
  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-[var(--color-accent-primary)] border-x-transparent border-b-transparent",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-b-[var(--color-accent-primary)] border-x-transparent border-t-transparent",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-l-[var(--color-accent-primary)] border-y-transparent border-r-transparent",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-r-[var(--color-accent-primary)] border-y-transparent border-l-transparent",
  };

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "absolute z-50 w-64 p-4 bg-accent-primary text-white rounded-lg shadow-lg",
              positionClasses[position]
            )}
          >
            {/* Arrow */}
            <div
              className={cn(
                "absolute w-0 h-0 border-[6px]",
                arrowClasses[position]
              )}
            />
            
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm">{title}</h4>
              <button
                onClick={onDismiss}
                className="p-0.5 rounded hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to manage onboarding state
 */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  useEffect(() => {
    // Check localStorage for onboarding state
    const seen = localStorage.getItem("proman-onboarding-seen");
    const completed = localStorage.getItem("proman-onboarding-completed");
    
    if (!seen) {
      setShowOnboarding(true);
      setHasSeenOnboarding(false);
    }
    
    if (completed) {
      try {
        setCompletedSteps(JSON.parse(completed));
      } catch {
        // ignore parse error
      }
    }
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    localStorage.setItem("proman-onboarding-seen", "true");
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    localStorage.setItem("proman-onboarding-seen", "skipped");
  };

  const completeStep = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    localStorage.setItem("proman-onboarding-completed", JSON.stringify(newCompleted));
  };

  const resetOnboarding = () => {
    setShowOnboarding(true);
    setHasSeenOnboarding(false);
    setCompletedSteps([]);
    localStorage.removeItem("proman-onboarding-seen");
    localStorage.removeItem("proman-onboarding-completed");
  };

  return {
    showOnboarding,
    hasSeenOnboarding,
    completedSteps,
    completeOnboarding,
    skipOnboarding,
    completeStep,
    resetOnboarding,
  };
}
