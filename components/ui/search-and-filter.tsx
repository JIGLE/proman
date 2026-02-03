import * as React from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { Button } from "./button"
import { Input } from "./input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "./dropdown-menu"
import { Badge } from "./badge"

interface FilterOption {
  label: string
  value: string
}

interface FilterGroup {
  key: string
  label: string
  options: FilterOption[]
  multiple?: boolean
  defaultValue?: string | string[]
}

interface SearchAndFilterProps {
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder?: string
  filters?: FilterGroup[]
  onFiltersChange?: (filters: Record<string, string | string[]>) => void
  className?: string
  showFilterCount?: boolean
}

export function SearchAndFilter({
  searchValue,
  onSearchChange,
  placeholder = "Search...",
  filters = [],
  onFiltersChange,
  className,
  showFilterCount = true
}: SearchAndFilterProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string | string[]>>({})
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)

  React.useEffect(() => {
    // Initialize filters with default values
    const initialFilters: Record<string, string | string[]> = {}
    filters.forEach(filter => {
      if (filter.defaultValue) {
        initialFilters[filter.key] = filter.defaultValue
      }
    })
    setActiveFilters(initialFilters)
  }, [filters])

  React.useEffect(() => {
    onFiltersChange?.(activeFilters)
  }, [activeFilters, onFiltersChange])

  const handleFilterChange = (filterKey: string, value: string, multiple = false) => {
    setActiveFilters(prev => {
      const current = prev[filterKey]
      
      if (multiple) {
        const currentArray = Array.isArray(current) ? current : []
        const newArray = currentArray.includes(value)
          ? currentArray.filter(v => v !== value)
          : [...currentArray, value]
        
        const result = { ...prev }
        if (newArray.length > 0) {
          result[filterKey] = newArray
        } else {
          delete result[filterKey]
        }
        return result
      } else {
        const result = { ...prev }
        if (current === value) {
          delete result[filterKey]
        } else {
          result[filterKey] = value
        }
        return result
      }
    })
  }

  const clearFilter = (filterKey: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[filterKey]
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setActiveFilters({})
  }

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key]
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value !== undefined
    }).length
  }

  const getFilterDisplayValue = (filter: FilterGroup) => {
    const value = activeFilters[filter.key]
    if (!value) return null
    
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} selected` : null
    }
    
    const option = filter.options.find(opt => opt.value === value)
    return option?.label || value
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 focus-ring"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        {filters.length > 0 && (
          <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 relative",
                  getActiveFilterCount() > 0 && "border-accent-primary/50 text-accent-primary"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {showFilterCount && getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" size="sm" className="ml-1 h-5 px-1.5">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64 surface-overlay">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Filter Options</span>
                {getActiveFilterCount() > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-auto p-0 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Clear all
                  </Button>
                )}
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              {filters.map((filter, index) => (
                <div key={filter.key}>
                  <DropdownMenuLabel className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    {filter.label}
                  </DropdownMenuLabel>
                  
                  {filter.options.map((option) => {
                    const isActive = filter.multiple
                      ? Array.isArray(activeFilters[filter.key]) && 
                        (activeFilters[filter.key] as string[]).includes(option.value)
                      : activeFilters[filter.key] === option.value
                    
                    return filter.multiple ? (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={isActive}
                        onCheckedChange={() => handleFilterChange(filter.key, option.value, true)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ) : (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleFilterChange(filter.key, option.value, false)}
                        className={cn(isActive && "bg-accent-primary/10 text-accent-primary")}
                      >
                        {option.label}
                        {isActive && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                    )
                  })}
                  
                  {index < filters.length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 font-medium">Active filters:</span>
          
          {filters.map((filter) => {
            const displayValue = getFilterDisplayValue(filter)
            if (!displayValue) return null
            
            return (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-red-500/10 hover:text-red-400 transition-colors"
                onClick={() => clearFilter(filter.key)}
              >
                <span>{filter.label}: {displayValue}</span>
                <X className="h-3 w-3" />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
