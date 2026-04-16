"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SortDirection } from "@/lib/hooks/use-sortable-data";

export interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortDirection;
  onSort: (key: string) => void;
}

export function SortableHeader({ label, sortKey, currentSort, onSort }: SortableHeaderProps) {
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
    >
      {label}
      {currentSort === "asc" && <ArrowUp className="w-3 h-3" />}
      {currentSort === "desc" && <ArrowDown className="w-3 h-3" />}
      {currentSort === null && <ArrowUpDown className="w-3 h-3 opacity-50" />}
    </button>
  );
}
