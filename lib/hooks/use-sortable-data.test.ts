import { describe, it, expect } from 'vitest';
import { useSortableData } from '../../lib/hooks/use-sortable-data';

describe('useSortableData', () => {
  it('should exist and be a function', () => {
    expect(useSortableData).toBeDefined();
    expect(typeof useSortableData).toBe('function');
  });
});