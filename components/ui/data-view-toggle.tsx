"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export type DataViewMode = "grid" | "table";

interface DataViewToggleProps {
  mode: DataViewMode;
  onChange: (mode: DataViewMode) => void;
  className?: string;
}

export function DataViewToggle({ mode, onChange, className }: DataViewToggleProps) {
  return (
    <div
      className={cn("flex items-center gap-1 rounded-md border border-zinc-800 p-0.5", className)}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 w-7 p-0", mode === "grid" && "bg-zinc-800 text-zinc-100")}
        onClick={() => onChange("grid")}
        title="Card view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 w-7 p-0", mode === "table" && "bg-zinc-800 text-zinc-100")}
        onClick={() => onChange("table")}
        title="Table view"
      >
        <Table2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
