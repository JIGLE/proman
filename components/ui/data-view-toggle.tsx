"use client";

import { LayoutGrid, ListTree, Map, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export type DataViewMode = "grid" | "table" | "tree" | "map";

interface DataViewToggleProps {
  mode: DataViewMode;
  onChange: (mode: DataViewMode) => void;
  showMap?: boolean;
  /** Structural tree view (Situs portfolio inventory). Off by default so other consumers are unaffected. */
  showTree?: boolean;
  /** Card/grid view. On by default; the Portfolio hides it in favour of tree + table. */
  showGrid?: boolean;
  className?: string;
}

export function DataViewToggle({
  mode,
  onChange,
  showMap = false,
  showTree = false,
  showGrid = true,
  className,
}: DataViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn("flex items-center gap-1 border border-[var(--color-border)] p-0.5", className)}
    >
      {showGrid && (
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            mode === "grid" && "bg-[var(--color-hover)] text-[var(--color-foreground)]",
          )}
          onClick={() => onChange("grid")}
          aria-label="Card view"
          aria-pressed={mode === "grid"}
          title="Card view"
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(mode === "table" && "bg-[var(--color-hover)] text-[var(--color-foreground)]")}
        onClick={() => onChange("table")}
        aria-label="Table view"
        aria-pressed={mode === "table"}
        title="Table view"
      >
        <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      {showTree && (
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            mode === "tree" && "bg-[var(--color-hover)] text-[var(--color-foreground)]",
          )}
          onClick={() => onChange("tree")}
          aria-label="Tree view"
          aria-pressed={mode === "tree"}
          title="Tree view"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
      {showMap && (
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(mode === "map" && "bg-[var(--color-hover)] text-[var(--color-foreground)]")}
          onClick={() => onChange("map")}
          aria-label="Map view"
          aria-pressed={mode === "map"}
          title="Map view"
        >
          <Map className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
