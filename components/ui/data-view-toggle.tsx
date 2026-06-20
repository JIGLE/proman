"use client";

import { LayoutGrid, Map, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export type DataViewMode = "grid" | "table" | "map";

interface DataViewToggleProps {
  mode: DataViewMode;
  onChange: (mode: DataViewMode) => void;
  showMap?: boolean;
  className?: string;
}

export function DataViewToggle({
  mode,
  onChange,
  showMap = false,
  className,
}: DataViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn(
        "flex items-center gap-1 rounded-md border border-[var(--color-border)] p-0.5",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          mode === "grid" && "bg-[var(--color-surface)] text-[var(--color-foreground)]",
        )}
        onClick={() => onChange("grid")}
        aria-label="Card view"
        aria-pressed={mode === "grid"}
        title="Card view"
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          mode === "table" && "bg-[var(--color-surface)] text-[var(--color-foreground)]",
        )}
        onClick={() => onChange("table")}
        aria-label="Table view"
        aria-pressed={mode === "table"}
        title="Table view"
      >
        <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      {showMap && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            mode === "map" && "bg-[var(--color-surface)] text-[var(--color-foreground)]",
          )}
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
