"use client";

import * as React from "react";
import { debounce } from "lodash";

// Auto-save hook for form data
export interface UseAutoSaveOptions {
  key: string;
  delay?: number;
  enabled?: boolean;
  onSave?: (data: any) => Promise<void>;
  onRestore?: (data: any) => void;
  excludeFields?: string[];
}

export function useAutoSave<T extends Record<string, any>>(
  data: T,
  options: UseAutoSaveOptions
) {
  const {
    key,
    delay = 2000,
    enabled = true,
    onSave,
    onRestore,
    excludeFields = []
  } = options;

  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const previousDataRef = React.useRef<T>(data);

  // Filter out excluded fields
  const getFilteredData = React.useCallback((data: T) => {
    if (excludeFields.length === 0) return data;
    
    const filtered = { ...data };
    excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [excludeFields]);

  // Save to localStorage
  const saveToLocalStorage = React.useCallback((data: T) => {
    try {
      const filteredData = getFilteredData(data);
      localStorage.setItem(`autosave_${key}`, JSON.stringify({
        data: filteredData,
        timestamp: new Date().toISOString()
      }));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [key, getFilteredData]);

  // Restore from localStorage
  const restoreFromLocalStorage = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      if (saved) {
        const { data: savedData, timestamp } = JSON.parse(saved);
        setLastSaved(new Date(timestamp));
        onRestore?.(savedData);
        return savedData;
      }
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
    }
    return null;
  }, [key, onRestore]);

  // Auto-save function with debounce
  const debouncedSave = React.useMemo(
    () => debounce(async (data: T) => {
      if (!enabled) return;
      
      setIsSaving(true);
      
      try {
        // Save to localStorage
        saveToLocalStorage(data);
        
        // Call custom save function if provided
        if (onSave) {
          await onSave(getFilteredData(data));
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay),
    [enabled, delay, onSave, saveToLocalStorage, getFilteredData]
  );

  // Track data changes
  React.useEffect(() => {
    const currentData = getFilteredData(data);
    const previousData = getFilteredData(previousDataRef.current);
    
    // Check if data has actually changed
    if (JSON.stringify(currentData) !== JSON.stringify(previousData)) {
      setHasUnsavedChanges(true);
      debouncedSave(data);
      previousDataRef.current = data;
    }
  }, [data, debouncedSave, getFilteredData]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Clear saved data
  const clearSaved = React.useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
    setLastSaved(null);
    setHasUnsavedChanges(false);
  }, [key]);

  // Force save
  const forceSave = React.useCallback(async () => {
    debouncedSave.cancel();
    await debouncedSave(data);
  }, [data, debouncedSave]);

  // Check if there's saved data available
  const hasSavedData = React.useCallback(() => {
    return localStorage.getItem(`autosave_${key}`) !== null;
  }, [key]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    restoreFromLocalStorage,
    clearSaved,
    forceSave,
    hasSavedData
  };
}

// Form persistence hook for maintaining form state
export interface UseFormPersistenceOptions {
  key: string;
  enabled?: boolean;
  fields?: string[];
  ttl?: number; // Time to live in milliseconds
}

export function useFormPersistence<T extends Record<string, any>>(
  formData: T,
  setFormData: (data: T | ((prev: T) => T)) => void,
  options: UseFormPersistenceOptions
) {
  const { key, enabled = true, fields, ttl } = options;

  // Save form data to localStorage
  const saveFormData = React.useCallback(() => {
    if (!enabled) return;
    
    try {
      const dataToSave = fields 
        ? Object.fromEntries(
            Object.entries(formData).filter(([k]) => fields.includes(k))
          )
        : formData;
      
      const persistData = {
        data: dataToSave,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`form_${key}`, JSON.stringify(persistData));
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  }, [enabled, formData, fields, key]);

  // Load form data from localStorage
  const loadFormData = React.useCallback(() => {
    if (!enabled) return null;
    
    try {
      const saved = localStorage.getItem(`form_${key}`);
      if (!saved) return null;
      
      const { data, timestamp } = JSON.parse(saved);
      
      // Check if data has expired
      if (ttl && Date.now() - timestamp > ttl) {
        localStorage.removeItem(`form_${key}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load form data:', error);
      return null;
    }
  }, [enabled, key, ttl]);

  // Clear persisted form data
  const clearFormData = React.useCallback(() => {
    localStorage.removeItem(`form_${key}`);
  }, [key]);

  // Check if there's persisted data
  const hasPersistedData = React.useCallback(() => {
    return loadFormData() !== null;
  }, [loadFormData]);

  // Restore form data
  const restoreFormData = React.useCallback(() => {
    const savedData = loadFormData();
    if (savedData) {
      setFormData(prevData => ({ ...prevData, ...savedData }));
      return true;
    }
    return false;
  }, [loadFormData, setFormData]);

  // Auto-save on form data changes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFormData();
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [formData, saveFormData]);

  return {
    saveFormData,
    loadFormData,
    clearFormData,
    hasPersistedData,
    restoreFormData
  };
}

// Auto-save status component
export interface AutoSaveStatusProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  className?: string;
}

export function AutoSaveStatus({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  className
}: AutoSaveStatusProps) {
  const getStatusText = () => {
    if (isSaving) return "Saving...";
    if (hasUnsavedChanges) return "Unsaved changes";
    if (lastSaved) {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return "Saved just now";
      if (minutes < 60) return `Saved ${minutes}m ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Saved ${hours}h ago`;
      
      return `Saved ${lastSaved.toLocaleDateString()}`;
    }
    return "No changes";
  };

  const getStatusColor = () => {
    if (isSaving) return "text-[var(--color-warning)]";
    if (hasUnsavedChanges) return "text-[var(--color-error)]";
    return "text-[var(--color-success)]";
  };

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs",
      getStatusColor(),
      className
    )}>
      {isSaving && (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
      )}
      <span>{getStatusText()}</span>
    </div>
  );
}

// Form recovery component
export interface FormRecoveryProps {
  onRestore: () => void;
  onDiscard: () => void;
  lastSaved?: Date;
  className?: string;
}

export function FormRecovery({
  onRestore,
  onDiscard,
  lastSaved,
  className
}: FormRecoveryProps) {
  return (
    <div className={cn(
      "p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-lg",
      className
    )}>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            Unsaved changes found
          </h3>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {lastSaved 
              ? `Last saved: ${lastSaved.toLocaleString()}`
              : "We found unsaved changes from a previous session."
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="px-3 py-1.5 text-xs font-medium bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            Restore changes
          </button>
          
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility function imports
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
