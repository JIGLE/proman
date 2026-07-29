"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

interface SegmentedFilterOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedFilterProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedFilterOption<T>[];
  className?: string;
}

export function SegmentedFilter<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: SegmentedFilterProps<T>): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-[var(--color-border)] p-1",
        className,
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onValueChange(option.value)}
          // `sm` supplies the height floor, but only the icon sizes carry a width one — so a
          // short label like "All" stayed 41px wide. These are discrete tap targets in a row,
          // not prose, so a width floor is appropriate here.
          className="h-7 px-3 max-md:min-w-11"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
