"use client";

import * as React from 'react';
import { useState, useCallback, createContext, useContext } from 'react';
import { ZodSchema, ZodError } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Inline Entity Creation Hook
 * 
 * Implements Rule 6 from UI/UX plan:
 * - Max 2 levels of inline creation
 * - Never navigate away from parent form
 * - Entity created inline, automatically selected
 * 
 * Usage:
 * ```tsx
 * const inlineCreate = useInlineCreate<TenantFormData, Tenant>({
 *   schema: tenantSchema,
 *   onSubmit: async (data) => {
 *     const tenant = await createTenant(data);
 *     return tenant;
 *   },
 *   dialogTitle: "Create Tenant",
 *   dialogDescription: "Add a new tenant without leaving the current form",
 * });
 * 
 * // In your form:
 * <Select value={selectedTenant}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select tenant" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
 *     <Button onClick={inlineCreate.open}>
 *       <Plus /> Create New Tenant
 *     </Button>
 *   </SelectContent>
 * </Select>
 * 
 * {inlineCreate.dialog}
 * ```
 */

export interface UseInlineCreateOptions<TForm, TEntity> {
  /** Zod schema for form validation */
  schema: ZodSchema<TForm>;
  /** Initial form data */
  initialData: TForm;
  /** Submit handler - must return the created entity */
  onSubmit: (data: TForm) => Promise<TEntity>;
  /** Called when entity is created successfully */
  onCreated?: (entity: TEntity) => void;
  /** Dialog title */
  dialogTitle: string;
  /** Dialog description */
  dialogDescription?: string;
  /** Form render function */
  renderForm: (props: InlineFormProps<TForm>) => React.ReactNode;
}

export interface InlineFormProps<TForm> {
  formData: TForm;
  formErrors: Partial<Record<keyof TForm, string>>;
  updateFormData: (updates: Partial<TForm>) => void;
  isSubmitting: boolean;
}

export interface UseInlineCreateReturn<TEntity> {
  /** Open the inline creation dialog */
  open: () => void;
  /** Close the dialog */
  close: () => void;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The last created entity (for auto-selection) */
  createdEntity: TEntity | null;
  /** Reset the created entity */
  resetCreatedEntity: () => void;
  /** The dialog component to render */
  dialog: React.ReactNode;
}

export function useInlineCreate<TForm extends Record<string, any>, TEntity>({
  schema,
  initialData,
  onSubmit,
  onCreated,
  dialogTitle,
  dialogDescription,
  renderForm,
}: UseInlineCreateOptions<TForm, TEntity>): UseInlineCreateReturn<TEntity> {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TForm>(initialData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TForm, string>>>({});
  const [createdEntity, setCreatedEntity] = useState<TEntity | null>(null);

  const open = useCallback(() => {
    setFormData(initialData);
    setFormErrors({});
    setIsOpen(true);
  }, [initialData]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetCreatedEntity = useCallback(() => {
    setCreatedEntity(null);
  }, []);

  const updateFormData = useCallback((updates: Partial<TForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    setFormErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach(key => {
        delete newErrors[key as keyof TForm];
      });
      return newErrors;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Validate
      const validatedData = await schema.parseAsync(formData);
      
      // Submit
      const entity = await onSubmit(validatedData);
      
      // Store and notify
      setCreatedEntity(entity);
      onCreated?.(entity);
      
      // Close dialog
      close();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Partial<Record<keyof TForm, string>> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0] as keyof TForm;
          if (field) {
            errors[field] = issue.message;
          }
        });
        setFormErrors(errors);
      }
      console.error('Inline create error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, formData, onSubmit, onCreated, close]);

  const dialog = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          {dialogDescription && (
            <DialogDescription>{dialogDescription}</DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderForm({
            formData,
            formErrors,
            updateFormData,
            isSubmitting,
          })}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return {
    open,
    close,
    isOpen,
    createdEntity,
    resetCreatedEntity,
    dialog,
  };
}

/**
 * Inline Create Trigger Button
 * Standard button for triggering inline entity creation
 */
export interface InlineCreateTriggerProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function InlineCreateTrigger({
  label,
  onClick,
  disabled,
  className,
}: InlineCreateTriggerProps): React.ReactElement {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Plus className="h-4 w-4 mr-1" />
      {label}
    </Button>
  );
}

/**
 * Context for tracking inline creation depth
 * Enforces max 2 levels of nesting
 */
interface InlineCreateContextValue {
  depth: number;
  maxDepth: number;
  canCreateInline: boolean;
}

const InlineCreateContext = createContext<InlineCreateContextValue>({
  depth: 0,
  maxDepth: 2,
  canCreateInline: true,
});

export function InlineCreateProvider({
  children,
  maxDepth = 2,
}: {
  children: React.ReactNode;
  maxDepth?: number;
}): React.ReactElement {
  const parent = useContext(InlineCreateContext);
  const depth = parent.depth + 1;
  const canCreateInline = depth < maxDepth;

  return (
    <InlineCreateContext.Provider value={{ depth, maxDepth, canCreateInline }}>
      {children}
    </InlineCreateContext.Provider>
  );
}

export function useInlineCreateContext(): InlineCreateContextValue {
  return useContext(InlineCreateContext);
}

export default useInlineCreate;
