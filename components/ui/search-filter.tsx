"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "./debounce";
import { Search, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "@/lib/utils/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface SearchFilterProps {
  onSearchChange: (value: string) => void;
  onFilterChange?: (key: string, value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    defaultValue?: string;
  }[];
  debounceMs?: number;
  className?: string;
  showClearButton?: boolean;
}

export function SearchFilter({
  onSearchChange,
  onFilterChange,
  searchPlaceholder = "Search...",
  filters = [],
  debounceMs = 300,
  className,
  showClearButton = true,
}: SearchFilterProps): React.ReactElement {
  const [searchValue, setSearchValue] = useState("");

  // Debounced search handler
  const debouncedOnSearchChange = useRef(
    debounce((value: string) => {
      onSearchChange(value);
    }, debounceMs),
  );

  useEffect(() => {
    debouncedOnSearchChange.current = debounce((value: string) => {
      onSearchChange(value);
    }, debounceMs);
    // Cancel on unmount
    return () => {
      debouncedOnSearchChange.current.cancel();
    };
  }, [onSearchChange, debounceMs]);

  useEffect(() => {
    debouncedOnSearchChange.current(searchValue);
  }, [searchValue]);

  const handleClear = useCallback(() => {
    setSearchValue("");
    debouncedOnSearchChange.current.cancel();
    onSearchChange("");
  }, [onSearchChange]);

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      if (onFilterChange) {
        onFilterChange(key, value);
      }
    },
    [onFilterChange],
  );

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {showClearButton && searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            aria-label="Clear search"
            data-testid="clear-search-btn"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <div key={filter.key}>
          <Select
            defaultValue={filter.defaultValue || "all"}
            onValueChange={(value) => handleFilterChange(filter.key, value)}
          >
            <SelectTrigger
              className="w-full sm:w-[180px]"
              data-testid={`select-trigger-${filter.key}`}
            >
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  data-testid={`select-item-${option.value}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {process.env.NODE_ENV === "test" && (
            <select
              data-testid={`native-select-${filter.key}`}
              value={filter.defaultValue || "all"}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              hidden
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
