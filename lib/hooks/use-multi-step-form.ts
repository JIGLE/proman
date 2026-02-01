"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { z } from "zod";

export interface StepConfig<T> {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Fields that belong to this step */
  fields: (keyof T)[];
  /** Optional condition to skip this step */
  skipIf?: (data: Partial<T>) => boolean;
  /** Optional custom validation for step */
  validate?: (data: Partial<T>) => Record<string, string> | null;
}

export interface UseMultiStepFormOptions<T extends Record<string, unknown>> {
  /** Step configurations */
  steps: StepConfig<T>[];
  /** Full Zod schema for all fields */
  schema: z.ZodSchema<T>;
  /** Per-step schemas (optional, for step-level validation) */
  stepSchemas?: z.ZodSchema<Partial<T>>[];
  /** Initial form data */
  initialData: T;
  /** Submit callback when all steps complete */
  onComplete: (data: T) => Promise<void>;
  /** Callback when step changes */
  onStepChange?: (step: number, data: Partial<T>) => void;
  /** Enable localStorage persistence */
  persistence?: {
    key: string;
    /** Time-to-live in milliseconds (default: 24 hours) */
    ttl?: number;
  };
}

export interface UseMultiStepFormReturn<T extends Record<string, unknown>> {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Current step configuration */
  currentStepConfig: StepConfig<T>;
  /** All step configurations */
  steps: StepConfig<T>[];
  /** Form data */
  formData: T;
  /** Form errors for current step fields */
  stepErrors: Partial<Record<keyof T, string>>;
  /** All form errors */
  allErrors: Partial<Record<keyof T, string>>;
  /** Whether the form is submitting */
  isSubmitting: boolean;
  /** Whether current step is valid */
  isStepValid: boolean;
  /** Whether on first step */
  isFirstStep: boolean;
  /** Whether on last step */
  isLastStep: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Go to next step */
  nextStep: () => Promise<boolean>;
  /** Go to previous step */
  prevStep: () => void;
  /** Go to specific step */
  goToStep: (step: number) => void;
  /** Update form data */
  updateFormData: (updates: Partial<T>) => void;
  /** Validate current step */
  validateStep: () => Promise<boolean>;
  /** Validate entire form */
  validateForm: () => Promise<boolean>;
  /** Submit the form */
  handleSubmit: () => Promise<void>;
  /** Reset form to initial state */
  resetForm: () => void;
  /** Check if a step has been completed */
  isStepCompleted: (stepIndex: number) => boolean;
  /** Get visited steps */
  visitedSteps: Set<number>;
  /** Check if there's a draft saved */
  hasDraft: boolean;
  /** Clear saved draft */
  clearDraft: () => void;
}

/**
 * Hook for managing multi-step forms with validation and persistence
 */
export function useMultiStepForm<T extends Record<string, unknown>>(
  options: UseMultiStepFormOptions<T>
): UseMultiStepFormReturn<T> {
  const {
    steps,
    schema,
    stepSchemas,
    initialData,
    onComplete,
    onStepChange,
    persistence,
  } = options;

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<T>(initialData);
  const [allErrors, setAllErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [hasDraft, setHasDraft] = useState(false);

  // Filter out skipped steps
  const activeSteps = useMemo(() => {
    return steps.filter((step) => !step.skipIf?.(formData));
  }, [steps, formData]);

  const currentStepConfig = activeSteps[currentStep] || steps[0];
  const totalSteps = activeSteps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  // Get errors for current step fields only
  const stepErrors = useMemo(() => {
    const errors: Partial<Record<keyof T, string>> = {};
    for (const field of currentStepConfig.fields) {
      if (allErrors[field]) {
        errors[field] = allErrors[field];
      }
    }
    return errors;
  }, [allErrors, currentStepConfig.fields]);

  const isStepValid = useMemo(() => {
    return Object.keys(stepErrors).length === 0;
  }, [stepErrors]);

  // Load from persistence on mount
  useEffect(() => {
    if (persistence) {
      const saved = localStorage.getItem(persistence.key);
      if (saved) {
        try {
          const { data, timestamp, step } = JSON.parse(saved);
          const ttl = persistence.ttl || 24 * 60 * 60 * 1000; // 24 hours default
          
          if (Date.now() - timestamp < ttl) {
            setFormData(data);
            setCurrentStep(step);
            setHasDraft(true);
          } else {
            localStorage.removeItem(persistence.key);
          }
        } catch {
          localStorage.removeItem(persistence.key);
        }
      }
    }
  }, [persistence]);

  // Save to persistence when data changes
  useEffect(() => {
    if (persistence && Object.keys(formData).some((k) => formData[k as keyof T] !== initialData[k as keyof T])) {
      localStorage.setItem(
        persistence.key,
        JSON.stringify({
          data: formData,
          step: currentStep,
          timestamp: Date.now(),
        })
      );
      setHasDraft(true);
    }
  }, [formData, currentStep, persistence, initialData]);

  const clearDraft = useCallback(() => {
    if (persistence) {
      localStorage.removeItem(persistence.key);
      setHasDraft(false);
    }
  }, [persistence]);

  const updateFormData = useCallback((updates: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    setAllErrors((prev) => {
      const newErrors = { ...prev };
      for (const key of Object.keys(updates)) {
        delete newErrors[key as keyof T];
      }
      return newErrors;
    });
  }, []);

  const validateStep = useCallback(async (): Promise<boolean> => {
    // Use step schema if available
    const stepSchema = stepSchemas?.[currentStep];
    
    // Use custom step validation if provided
    if (currentStepConfig.validate) {
      const customErrors = currentStepConfig.validate(formData);
      if (customErrors) {
        setAllErrors((prev) => ({ ...prev, ...customErrors }));
        return false;
      }
    }

    if (stepSchema) {
      const result = stepSchema.safeParse(formData);
      if (!result.success) {
        const errors: Partial<Record<keyof T, string>> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof T;
          if (currentStepConfig.fields.includes(field)) {
            errors[field] = issue.message;
          }
        }
        setAllErrors((prev) => ({ ...prev, ...errors }));
        return Object.keys(errors).length === 0;
      }
    }

    // Validate only current step fields against main schema
    try {
      // Partial validation - just check the current step fields exist and are valid
      const stepData: Partial<T> = {};
      for (const field of currentStepConfig.fields) {
        stepData[field] = formData[field];
      }
      
      // Clear step errors
      setAllErrors((prev) => {
        const newErrors = { ...prev };
        for (const field of currentStepConfig.fields) {
          delete newErrors[field];
        }
        return newErrors;
      });
      
      return true;
    } catch {
      return false;
    }
  }, [currentStep, stepSchemas, currentStepConfig, formData]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    const result = schema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof T, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof T;
        errors[field] = issue.message;
      }
      setAllErrors(errors);
      return false;
    }
    setAllErrors({});
    return true;
  }, [schema, formData]);

  const nextStep = useCallback(async (): Promise<boolean> => {
    const isValid = await validateStep();
    if (!isValid) return false;

    if (currentStep < totalSteps - 1) {
      const nextIdx = currentStep + 1;
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(nextIdx);
      setVisitedSteps((prev) => new Set([...prev, nextIdx]));
      onStepChange?.(nextIdx, formData);
    }
    return true;
  }, [currentStep, totalSteps, validateStep, onStepChange, formData]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      onStepChange?.(prevIdx, formData);
    }
  }, [currentStep, onStepChange, formData]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps && visitedSteps.has(step)) {
      setCurrentStep(step);
      onStepChange?.(step, formData);
    }
  }, [totalSteps, visitedSteps, onStepChange, formData]);

  const handleSubmit = useCallback(async () => {
    const isValid = await validateForm();
    if (!isValid) {
      // Find first step with errors
      for (let i = 0; i < activeSteps.length; i++) {
        const step = activeSteps[i];
        for (const field of step.fields) {
          if (allErrors[field]) {
            setCurrentStep(i);
            return;
          }
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(formData);
      clearDraft();
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onComplete, formData, clearDraft, activeSteps, allErrors]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setCurrentStep(0);
    setAllErrors({});
    setVisitedSteps(new Set([0]));
    setCompletedSteps(new Set());
    clearDraft();
  }, [initialData, clearDraft]);

  const isStepCompleted = useCallback(
    (stepIndex: number) => completedSteps.has(stepIndex),
    [completedSteps]
  );

  return {
    currentStep,
    totalSteps,
    currentStepConfig,
    steps: activeSteps,
    formData,
    stepErrors,
    allErrors,
    isSubmitting,
    isStepValid,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    goToStep,
    updateFormData,
    validateStep,
    validateForm,
    handleSubmit,
    resetForm,
    isStepCompleted,
    visitedSteps,
    hasDraft,
    clearDraft,
  };
}
