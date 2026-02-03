"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { ChevronRight, MoreVertical } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Checkbox } from "./checkbox";

/**
 * Responsive Data Display - Automatically switches between table and cards based on viewport
 * 
 * Usage:
 * ```tsx
 * <ResponsiveDataDisplay
 *   data={properties}
 *   columns={[
 *     { key: 'name', label: 'Name', primary: true },
 *     { key: 'address', label: 'Address' },
 *     { key: 'status', label: 'Status', render: (v) => <Badge>{v}</Badge> }
 *   ]}
 *   onRowClick={(item) => router.push(`/property/${item.id}`)}
 *   actions={[
 *     { label: 'Edit', onClick: (item) => handleEdit(item) },
 *     { label: 'Delete', onClick: (item) => handleDelete(item), destructive: true }
 *   ]}
 * />
 * ```
 */

export interface ResponsiveColumn<T> {
  /** Unique key for the column (corresponds to data property) */
  key: keyof T | string;
  /** Display label for column header */
  label: string;
  /** Mark as primary column (always visible on mobile) */
  primary?: boolean;
  /** Mark as secondary column (shown below primary on mobile) */
  secondary?: boolean;
  /** Custom render function */
  render?: (value: unknown, item: T) => React.ReactNode;
  /** Hide on mobile cards (only show in table) */
  hideOnMobile?: boolean;
  /** Column width class */
  width?: string;
  /** Enable sorting */
  sortable?: boolean;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  destructive?: boolean;
  disabled?: (item: T) => boolean;
}

export interface ResponsiveDataDisplayProps<T> {
  /** Data items to display */
  data: T[];
  /** Column configuration */
  columns: ResponsiveColumn<T>[];
  /** Unique key field for each item */
  keyField?: keyof T;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Row actions (shown in dropdown) */
  actions?: RowAction<T>[];
  /** Enable row selection */
  selectable?: boolean;
  /** Selected item IDs */
  selectedIds?: string[];
  /** Selection change handler */
  onSelectionChange?: (ids: string[]) => void;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

function getValue<T>(item: T, key: keyof T | string): unknown {
  const keyStr = String(key);
  if (keyStr.includes('.')) {
    const parts = keyStr.split('.');
    let value: unknown = item;
    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
    }
    return value;
  }
  return (item as Record<string, unknown>)[keyStr];
}

export function ResponsiveDataDisplay<T extends { id?: string }>({
  data,
  columns,
  keyField = 'id' as keyof T,
  onRowClick,
  actions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  emptyState,
  loading = false,
  className,
}: ResponsiveDataDisplayProps<T>): React.ReactElement {
  const primaryColumn = columns.find(c => c.primary) || columns[0];
  const secondaryColumns = columns.filter(c => c.secondary);
  const mobileVisibleColumns = columns.filter(c => !c.hideOnMobile && !c.primary);

  const handleSelect = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(item => String(getValue(item, keyField))));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Desktop skeleton */}
        <div className="hidden md:block animate-pulse">
          <div className="h-12 bg-[var(--color-muted)] rounded-t-lg" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)]" />
          ))}
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--color-surface)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {selectable && (
                <th className="w-12 p-4">
                  <Checkbox
                    checked={selectedIds.length === data.length && data.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.filter(c => !c.hideOnMobile || true).map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider",
                    column.width
                  )}
                >
                  {column.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="w-12 p-4" />
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const id = String(getValue(item, keyField));
              const isSelected = selectedIds.includes(id);

              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "border-b border-[var(--color-border)] transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[var(--color-surface-hover)]",
                    isSelected && "bg-[var(--color-accent)]/10"
                  )}
                >
                  {selectable && (
                    <td className="w-12 p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelect(id)}
                        aria-label={`Select row`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn("px-4 py-4 text-sm text-[var(--color-foreground)]", column.width)}
                    >
                      {column.render
                        ? column.render(getValue(item, column.key), item)
                        : String(getValue(item, column.key) ?? "-")}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="w-12 p-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, i) => (
                            <DropdownMenuItem
                              key={i}
                              onClick={() => action.onClick(item)}
                              disabled={action.disabled?.(item)}
                              className={cn(action.destructive && "text-[var(--color-destructive)]")}
                            >
                              {action.icon}
                              <span className={cn(action.icon && "ml-2")}>{action.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((item) => {
          const id = String(getValue(item, keyField));
          const isSelected = selectedIds.includes(id);

          return (
            <div
              key={id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]",
                "transition-all duration-200 active:scale-[0.98]",
                onRowClick && "cursor-pointer hover:border-[var(--color-accent)]",
                isSelected && "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Selection checkbox */}
                {selectable && (
                  <div onClick={(e) => e.stopPropagation()} className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(id)}
                      aria-label={`Select row`}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Primary field */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[var(--color-foreground)] truncate">
                      {primaryColumn.render
                        ? primaryColumn.render(getValue(item, primaryColumn.key), item)
                        : String(getValue(item, primaryColumn.key) ?? "-")}
                    </h3>
                    {onRowClick && (
                      <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)] flex-shrink-0" />
                    )}
                  </div>

                  {/* Secondary fields */}
                  {secondaryColumns.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {secondaryColumns.map((column) => (
                        <p
                          key={String(column.key)}
                          className="text-sm text-[var(--color-muted-foreground)] truncate"
                        >
                          {column.render
                            ? column.render(getValue(item, column.key), item)
                            : String(getValue(item, column.key) ?? "-")}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Additional visible fields */}
                  {mobileVisibleColumns.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mobileVisibleColumns.slice(0, 3).map((column) => (
                        <div
                          key={String(column.key)}
                          className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]"
                        >
                          <span className="font-medium">{column.label}:</span>
                          <span>
                            {column.render
                              ? column.render(getValue(item, column.key), item)
                              : String(getValue(item, column.key) ?? "-")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions dropdown */}
                {actions && actions.length > 0 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, i) => (
                          <DropdownMenuItem
                            key={i}
                            onClick={() => action.onClick(item)}
                            disabled={action.disabled?.(item)}
                            className={cn(action.destructive && "text-[var(--color-destructive)]")}
                          >
                            {action.icon}
                            <span className={cn(action.icon && "ml-2")}>{action.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ResponsiveDataDisplay;
