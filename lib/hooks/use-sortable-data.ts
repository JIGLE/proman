"use client";

import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export interface UseSortableDataReturn<T> {
  sortedData: T[];
  sortConfig: SortConfig<T> | null;
  requestSort: (key: keyof T) => void;
  getSortDirection: (key: keyof T) => SortDirection;
}

export function useSortableData<T>(
  data: T[],
  initialSortConfig: SortConfig<T> | null = null
): UseSortableDataReturn<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialSortConfig);

  const sortedData = useMemo(() => {
    if (!sortConfig || sortConfig.direction === null) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return aValue.getTime() - bValue.getTime();
      }

      // Fallback to string comparison
      return String(aValue).localeCompare(String(bValue));
    });

    return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig && sortConfig.key === key) {
      // Cycle through: asc -> desc -> null
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  const getSortDirection = (key: keyof T): SortDirection => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction;
  };

  return {
    sortedData,
    sortConfig,
    requestSort,
    getSortDirection,
  };
}
