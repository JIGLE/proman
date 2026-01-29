/*
import { describe, it, expect, beforeEach, vi } from 'vitest';
// import { renderHook } from '@testing-library/react-hooks';
// import { act } from 'react';
import { useFormDialog } from '../../lib/hooks/use-form-dialog';
import * as z from 'zod';
import { useToast } from '../../lib/toast-context';

// Mock the toast context
vi.mock('../../lib/toast-context', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  }))
}));

describe('useFormDialog', () => {
  const mockSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  });

  const initialData = { name: '', email: '' };
  const mockOnSubmit = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.formData).toEqual(initialData);
    expect(result.current.formErrors).toEqual({});
    expect(result.current.editingItem).toBe(null);
  });

  it('should open dialog correctly', () => {
    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    act(() => {
      result.current.openDialog();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.editingItem).toBe(null);
  });

  it('should open edit dialog with item data', () => {
    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    const testItem = { id: '1', name: 'Test', email: 'test@example.com' };
    const mapper = (item: any) => ({ name: item.name, email: item.email });

    act(() => {
      result.current.openEditDialog(testItem, mapper);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.editingItem).toBe(testItem);
    expect(result.current.formData).toEqual({ name: 'Test', email: 'test@example.com' });
  });

  it('should update form data correctly', () => {
    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    act(() => {
      result.current.updateFormData({ name: 'John' });
    });

    expect(result.current.formData).toEqual({ name: 'John', email: '' });

    act(() => {
      result.current.updateFormData({ email: 'john@example.com' });
    });

    expect(result.current.formData).toEqual({ name: 'John', email: 'john@example.com' });
  });

  it('should validate form data and show errors', async () => {
    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
    } as any;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(result.current.formErrors.name).toBe('Name is required');
    expect(result.current.formErrors.email).toBe('Invalid email');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    act(() => {
      result.current.updateFormData({ name: 'John', email: 'john@example.com' });
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as any;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({ name: 'John', email: 'john@example.com' }, false);
    expect(result.current.isOpen).toBe(false);
  });

  it('should handle submission errors with onError callback', async () => {
    const mockError = new Error('Submission failed');
    mockOnSubmit.mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' },
        onError: mockOnError
      })
    );

    act(() => {
      result.current.updateFormData({ name: 'John', email: 'john@example.com' });
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as any;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockOnError).toHaveBeenCalledWith('Failed to save. Please try again.');
  });

  it('should close dialog correctly', () => {
    const { result } = renderHook(() =>
      useFormDialog({
        schema: mockSchema,
        initialData,
        onSubmit: mockOnSubmit,
        successMessage: { create: 'Created!', update: 'Updated!' }
      })
    );

    // First open the dialog
    act(() => {
      result.current.openDialog();
    });
    expect(result.current.isOpen).toBe(true);

    // Then close it
    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.formData).toEqual(initialData);
    expect(result.current.formErrors).toEqual({});
    expect(result.current.editingItem).toBe(null);
  });
});
*/