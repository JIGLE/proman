import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortableData } from '../../lib/hooks/use-sortable-data';

describe('useSortableData', () => {
  const mockData = [
    { id: '1', name: 'John', age: 30, date: new Date('2023-01-01') },
    { id: '2', name: 'Alice', age: 25, date: new Date('2023-02-01') },
    { id: '3', name: 'Bob', age: 35, date: new Date('2022-12-01') },
  ];

  it('should initialize with unsorted data', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    expect(result.current.sortedData).toEqual(mockData);
    expect(result.current.sortConfig).toBe(null);
  });

  it('should initialize with custom sort config', () => {
    const initialSort = { key: 'name' as keyof typeof mockData[0], direction: 'asc' as const };
    const { result } = renderHook(() => useSortableData(mockData, initialSort));

    expect(result.current.sortConfig).toEqual(initialSort);
    expect(result.current.sortedData).toEqual([
      mockData[1], // Alice
      mockData[2], // Bob
      mockData[0], // John
    ]);
  });

  it('should sort strings in ascending order', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    act(() => {
      result.current.requestSort('name');
    });

    expect(result.current.getSortDirection('name')).toBe('asc');
    expect(result.current.sortedData).toEqual([
      mockData[1], // Alice
      mockData[2], // Bob
      mockData[0], // John
    ]);
  });

  it('should sort strings in descending order on second click', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    // First click - ascending
    act(() => {
      result.current.requestSort('name');
    });

    // Second click - descending
    act(() => {
      result.current.requestSort('name');
    });

    expect(result.current.getSortDirection('name')).toBe('desc');
    expect(result.current.sortedData).toEqual([
      mockData[0], // John
      mockData[2], // Bob
      mockData[1], // Alice
    ]);
  });

  it('should clear sort on third click', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    // First click - ascending
    act(() => {
      result.current.requestSort('name');
    });

    // Second click - descending
    act(() => {
      result.current.requestSort('name');
    });

    // Third click - clear sort
    act(() => {
      result.current.requestSort('name');
    });

    expect(result.current.getSortDirection('name')).toBe(null);
    expect(result.current.sortedData).toEqual(mockData);
    expect(result.current.sortConfig).toBe(null);
  });

  it('should sort numbers correctly', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    act(() => {
      result.current.requestSort('age');
    });

    expect(result.current.sortedData).toEqual([
      mockData[1], // Alice (25)
      mockData[0], // John (30)
      mockData[2], // Bob (35)
    ]);
  });

  it('should sort dates correctly', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    act(() => {
      result.current.requestSort('date');
    });

    expect(result.current.sortedData).toEqual([
      mockData[2], // Bob (2022-12-01)
      mockData[0], // John (2023-01-01)
      mockData[1], // Alice (2023-02-01)
    ]);
  });

  it('should handle null/undefined values', () => {
    const dataWithNulls = [
      { id: '1', name: 'John', value: 10 },
      { id: '2', name: null, value: null },
      { id: '3', name: 'Alice', value: 5 },
    ];

    const { result } = renderHook(() => useSortableData(dataWithNulls));

    act(() => {
      result.current.requestSort('name');
    });

    // Null values should be sorted to the end
    expect(result.current.sortedData[0]?.name).toBe('Alice');
    expect(result.current.sortedData[1]?.name).toBe('John');
    expect(result.current.sortedData[2]?.name).toBe(null);
  });

  it('should reset sort when switching to different column', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    // Sort by name descending
    act(() => {
      result.current.requestSort('name');
    });
    act(() => {
      result.current.requestSort('name');
    });

    expect(result.current.getSortDirection('name')).toBe('desc');

    // Switch to age - should start with ascending
    act(() => {
      result.current.requestSort('age');
    });

    expect(result.current.getSortDirection('age')).toBe('asc');
    expect(result.current.getSortDirection('name')).toBe(null);
  });

  it('should return correct sort direction for columns', () => {
    const { result } = renderHook(() => useSortableData(mockData));

    // Initially all columns should have null direction
    expect(result.current.getSortDirection('name')).toBe(null);
    expect(result.current.getSortDirection('age')).toBe(null);

    // Sort by name
    act(() => {
      result.current.requestSort('name');
    });

    expect(result.current.getSortDirection('name')).toBe('asc');
    expect(result.current.getSortDirection('age')).toBe(null);
  });

  it('should handle empty data array', () => {
    const { result } = renderHook(() => useSortableData([]));

    expect(result.current.sortedData).toEqual([]);

    act(() => {
      result.current.requestSort('name');
    });

    expect(result.current.sortedData).toEqual([]);
  });
});