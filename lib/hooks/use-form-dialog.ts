"use client";

import { useState, useCallback } from 'react';
import { ZodError, ZodSchema } from 'zod';
import { useToast } from '@/lib/toast-context';

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
}

export interface UseFormDialogReturn<T, E = T> {
  // Dialog state
  isOpen: boolean;
  isSubmitting: boolean;
  
  // Form data and errors
  formData: T;
  formErrors: Partial<Record<keyof T, string>>;
  editingItem: E | null;
  
  // Actions
  openDialog: () => void;
  closeDialog: () => void;
  openEditDialog: (item: E, mapToFormData?: (item: E) => T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  updateFormData: (updates: Partial<T>) => void;
  setFormData: (data: T) => void;
  resetForm: () => void;
}

export function useFormDialog<T extends Record<string, any>, E = T>({
  schema,
  onSubmit,
  onError: onErrorCallback,
  successMessage = { create: 'Item created successfully!', update: 'Item updated successfully!' },
  errorMessage = 'Failed to save. Please try again.',
  initialData,
}: UseFormDialogOptions<T>): UseFormDialogReturn<T, E> {
  const { success, error } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<T>(initialData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [editingItem, setEditingItem] = useState<E | null>(null);

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
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

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

  return {
    isOpen,
    isSubmitting,
    formData,
    formErrors,
    editingItem,
    openDialog,
    closeDialog,
    openEditDialog,
    handleSubmit,
    updateFormData,
    setFormData,
    resetForm,
  };
}
