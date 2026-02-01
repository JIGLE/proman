"use client";

import { useState, useCallback, useMemo } from "react";

export interface UseBulkSelectionOptions {
  /** Maximum number of items that can be selected */
  maxSelection?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface UseBulkSelectionReturn<T extends { id: string }> {
  /** Set of selected item IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Toggle selection for a single item */
  toggleSelection: (id: string) => void;
  /** Select multiple items (adds to existing selection) */
  selectMultiple: (ids: string[]) => void;
  /** Select all items from the provided list */
  selectAll: (items: T[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if all items in a list are selected */
  isAllSelected: (items: T[]) => boolean;
  /** Check if some (but not all) items are selected */
  isPartiallySelected: (items: T[]) => boolean;
  /** Get selected items from a list */
  getSelectedItems: (items: T[]) => T[];
  /** Toggle selection for range (shift+click) */
  toggleRange: (items: T[], fromId: string, toId: string) => void;
}

/**
 * Hook for managing bulk selection of items
 * Supports single select, multi-select, select all, and range selection
 */
export function useBulkSelection<T extends { id: string }>(
  options: UseBulkSelectionOptions = {}
): UseBulkSelectionReturn<T> {
  const { maxSelection, onSelectionChange } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedIds(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleSelection = useCallback(
    (id: string) => {
      const newSelection = new Set(selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        if (maxSelection && newSelection.size >= maxSelection) {
          return; // Don't add if at max
        }
        newSelection.add(id);
      }
      updateSelection(newSelection);
    },
    [selectedIds, maxSelection, updateSelection]
  );

  const selectMultiple = useCallback(
    (ids: string[]) => {
      const newSelection = new Set(selectedIds);
      for (const id of ids) {
        if (maxSelection && newSelection.size >= maxSelection) {
          break;
        }
        newSelection.add(id);
      }
      updateSelection(newSelection);
    },
    [selectedIds, maxSelection, updateSelection]
  );

  const selectAll = useCallback(
    (items: T[]) => {
      const idsToSelect = maxSelection
        ? items.slice(0, maxSelection).map((item) => item.id)
        : items.map((item) => item.id);
      updateSelection(new Set(idsToSelect));
    },
    [maxSelection, updateSelection]
  );

  const clearSelection = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  const isAllSelected = useCallback(
    (items: T[]) => {
      if (items.length === 0) return false;
      return items.every((item) => selectedIds.has(item.id));
    },
    [selectedIds]
  );

  const isPartiallySelected = useCallback(
    (items: T[]) => {
      if (items.length === 0) return false;
      const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
      return selectedCount > 0 && selectedCount < items.length;
    },
    [selectedIds]
  );

  const getSelectedItems = useCallback(
    (items: T[]) => {
      return items.filter((item) => selectedIds.has(item.id));
    },
    [selectedIds]
  );

  const toggleRange = useCallback(
    (items: T[], fromId: string, toId: string) => {
      const fromIndex = items.findIndex((item) => item.id === fromId);
      const toIndex = items.findIndex((item) => item.id === toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const startIndex = Math.min(fromIndex, toIndex);
      const endIndex = Math.max(fromIndex, toIndex);

      const rangeIds = items
        .slice(startIndex, endIndex + 1)
        .map((item) => item.id);

      selectMultiple(rangeIds);
    },
    [selectMultiple]
  );

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelection,
    selectMultiple,
    selectAll,
    clearSelection,
    isAllSelected,
    isPartiallySelected,
    getSelectedItems,
    toggleRange,
  };
}
