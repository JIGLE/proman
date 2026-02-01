import { describe, it, expect } from 'vitest';
import { useFormDialog } from '../../lib/hooks/use-form-dialog';

describe('useFormDialog', () => {
  it('should exist and be a function', () => {
    expect(useFormDialog).toBeDefined();
    expect(typeof useFormDialog).toBe('function');
  });
});