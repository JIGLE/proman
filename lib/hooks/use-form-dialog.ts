"use client";

import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { ZodError, ZodSchema } from 'zod';
import { useToast } from '@/lib/contexts/toast-context';

export interface UseFormDialogOptions<T> {
  schema: ZodSchema<T>;
  onSubmit: (data: T, isEdit: boolean) => Promise<void>;
  onError?: (errorMessage: string) => void;
  successMessage?: {
    create: string;
    update: string;
  };
  errorMessage?: string;
  initialData: T;
  // Auto-save options
  autoSave?: {
    enabled?: boolean;
    key: string;
    delay?: number;
    onSave?: (data: T) => Promise<void>;
    excludeFields?: string[];
  };
  // Form persistence options
  persistence?: {
    enabled?: boolean;
    key?: string;
    fields?: string[];
    ttl?: number;
  };
  // Validation options
  validation?: {
    validateOnChange?: boolean;
    debounceValidation?: number;
    showFieldErrors?: boolean;
  };
}

export interface UseFormDialogReturn<T, E = T> {
  // Dialog state
  isOpen: boolean;
  isSubmitting: boolean;
  
  // Form data and errors
  formData: T;
  formErrors: Partial<Record<keyof T, string>>;
  editingItem: E | null;
  
  // Validation state
  isValidating: boolean;
  hasUnsavedChanges: boolean;
  
  // Auto-save state
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Form recovery
  hasPersistedData: boolean;
  
  // Actions
  openDialog: () => void;
  closeDialog: () => void;
  openEditDialog: (item: E, mapToFormData?: (item: E) => T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  updateFormData: (updates: Partial<T>) => void;
  setFormData: (data: T) => void;
  resetForm: () => void;
  validateField: (field: keyof T, value: unknown) => Promise<string | null>;
  validateForm: () => Promise<boolean>;
  
  // Persistence actions
  restoreForm: () => boolean;
  clearPersistedData: () => void;
  forceSave: () => Promise<void>;
}

export function useFormDialog<T extends Record<string, unknown>, E = T>({
  schema,
  onSubmit,
  onError: onErrorCallback,
  successMessage = { create: 'Item created successfully!', update: 'Item updated successfully!' },
  errorMessage = 'Failed to save. Please try again.',
  initialData,
  autoSave: _autoSave = { enabled: false, key: 'form-autosave' },
  persistence: _persistence = { enabled: false },
  validation = { validateOnChange: false, debounceValidation: 500, showFieldErrors: true }
}: UseFormDialogOptions<T>): UseFormDialogReturn<T, E> {
  const { success, error } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [formData, setFormData] = useState<T>(initialData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [editingItem, setEditingItem] = useState<E | null>(null);
  
  // Debounce timer for validation
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Temporary placeholders for auto-save features (will be implemented later)
  const isSaving = false;
  const lastSaved = null;
  const hasUnsavedChanges = false;
  const _clearSaved = useCallback(() => {}, []);
  const clearFormData = useCallback(() => {}, []);
  const forceSave = useCallback(async () => {}, []);
  const hasPersistedData = useCallback(() => false, []);
  const restoreFormData = useCallback(() => false, []);

  // Field validation function
  const validateField = useCallback(async (field: keyof T, value: unknown): Promise<string | null> => {
    try {
      // Validate the full form data with the updated field
      const testData = { ...formData, [field]: value };
      await schema.parseAsync(testData);
      return null;
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldError = err.issues.find(issue => issue.path[0] === field);
        return fieldError?.message || null;
      }
      return 'Validation failed';
    }
  }, [schema, formData]);
  
  // Form validation function
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      setIsValidating(true);
      await schema.parseAsync(formData);
      setFormErrors({});
      return true;
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Partial<Record<keyof T, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof T;
          if (field) {
            errors[field] = issue.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [formData, schema]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setFormErrors({});
    setEditingItem(null);
  }, [initialData]);

  const openDialog = useCallback(() => {
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setTimeout(resetForm, 200); // Delay reset to avoid visual glitch
  }, [resetForm]);

  const openEditDialog = useCallback((item: E, mapToFormData?: (item: E) => T) => {
    const mappedData = mapToFormData ? mapToFormData(item) : (item as unknown as T);
    setFormData(mappedData);
    setEditingItem(item);
    setFormErrors({});
    setIsOpen(true);
  }, []);

  const updateFormData = useCallback((updates: Partial<T>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Validate on change if enabled
      if (validation.validateOnChange && validation.showFieldErrors) {
        // Clear existing timer
        if (validationTimerRef.current) {
          clearTimeout(validationTimerRef.current);
        }
        
        // Set new timer for debounced validation
        validationTimerRef.current = setTimeout(async () => {
          const newErrors: Partial<Record<keyof T, string>> = {};
          
          // Validate only the changed fields
          for (const [field, value] of Object.entries(updates)) {
            const fieldError = await validateField(field as keyof T, value);
            if (fieldError) {
              newErrors[field as keyof T] = fieldError;
            }
          }
          
          setFormErrors(prev => ({
            ...prev,
            ...newErrors,
            // Clear errors for fields that are now valid
            ...Object.fromEntries(
              Object.keys(updates).map(field => [
                field,
                newErrors[field as keyof T] || undefined
              ]).filter(([, error]) => error !== undefined)
            )
          }));
        }, validation.debounceValidation || 500);
      }
      
      return newData;
    });
  }, [validation.validateOnChange, validation.showFieldErrors, validation.debounceValidation, validateField]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Validate form data
      const validatedData = schema.parse(formData);
      
      // Call the onSubmit handler
      await onSubmit(validatedData, !!editingItem);
      
      // Show success message
      success(editingItem ? successMessage.update : successMessage.create);
      
      // Close dialog and reset
      closeDialog();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        // Map Zod errors to form fields
        const errors: Partial<Record<keyof T, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof T;
          if (field) {
            errors[field] = issue.message;
          }
        });
        setFormErrors(errors);
        const errorMsg = 'Please fix the form errors below.';
        if (onErrorCallback) {
          onErrorCallback(errorMsg);
        } else {
          error(errorMsg);
        }
      } else {
        const errorMsg = errorMessage;
        if (onErrorCallback) {
          onErrorCallback(errorMsg);
        } else {
          error(errorMsg);
        }
        console.error('Form submission error:', err);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, schema, onSubmit, onErrorCallback, editingItem, successMessage, errorMessage, success, error, closeDialog]);

  // Cleanup validation timer on unmount
  React.useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    isSubmitting,
    isValidating,
    formData,
    formErrors,
    editingItem,
    hasUnsavedChanges,
    isSaving,
    lastSaved,
    hasPersistedData: hasPersistedData(),
    openDialog,
    closeDialog,
    openEditDialog,
    handleSubmit,
    updateFormData,
    setFormData,
    resetForm,
    validateField,
    validateForm,
    restoreForm: restoreFormData,
    clearPersistedData: clearFormData,
    forceSave,
  };
}
