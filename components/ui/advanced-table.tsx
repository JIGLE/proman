import * as React from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown, Filter, Download, Settings2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "./dropdown-menu"
import { Input } from "./input"
import { Badge } from "./badge"

export interface AdvancedTableColumn<T> {
  id: keyof T
  header: string | React.ReactNode
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  resizable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  align?: 'left' | 'center' | 'right'
  sticky?: boolean
  hidden?: boolean
}

interface TableState<T> {
  sorting: { id: keyof T; desc: boolean }[]
  columnFilters: { id: keyof T; value: unknown }[]
  columnVisibility: Record<keyof T, boolean>
  rowSelection: Record<string, boolean>
  globalFilter: string
  pagination: {
    pageIndex: number
    pageSize: number
  }
}

interface AdvancedTableProps<T> {
  data: T[]
  columns: AdvancedTableColumn<T>[]
  className?: string
  enableSorting?: boolean
  enableFiltering?: boolean
  enableColumnVisibility?: boolean
  enableRowSelection?: boolean
  enablePagination?: boolean
  enableExport?: boolean
  pageSize?: number
  loading?: boolean
  onRowSelectionChange?: (selectedRows: T[]) => void
  onExport?: (data: T[]) => void
  emptyMessage?: string
}

export function AdvancedTable<T extends Record<string, any>>({
  data,
  columns,
  className,
  enableSorting = true,
  enableFiltering = true,
  enableColumnVisibility = true,
  enableRowSelection = false,
  enablePagination = true,
  enableExport = false,
  pageSize = 10,
  loading = false,
  onRowSelectionChange,
  onExport,
  emptyMessage = "No data available"
}: AdvancedTableProps<T>) {
  const [state, setState] = React.useState<TableState<T>>({
    sorting: [],
    columnFilters: [],
    columnVisibility: columns.reduce((acc, col) => {
      acc[col.id] = !col.hidden
      return acc
    }, {} as Record<keyof T, boolean>),
    rowSelection: {},
    globalFilter: '',
    pagination: {
      pageIndex: 0,
      pageSize
    }
  })

  // Memoized filtered and sorted data
  const processedData = React.useMemo(() => {
    let filtered = [...data]

    // Apply global filter
    if (state.globalFilter) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(state.globalFilter.toLowerCase())
        )
      )
    }

    // Apply column filters
    state.columnFilters.forEach(filter => {
      filtered = filtered.filter(item => {
        const value = item[filter.id]
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
      })
    })

    // Apply sorting
    if (state.sorting.length > 0) {
      filtered.sort((a, b) => {
        for (const sort of state.sorting) {
          const aValue = a[sort.id]
          const bValue = b[sort.id]
          
          if (aValue < bValue) return sort.desc ? 1 : -1
          if (aValue > bValue) return sort.desc ? -1 : 1
        }
        return 0
      })
    }

    return filtered
  }, [data, state.globalFilter, state.columnFilters, state.sorting])

  // Paginated data
  const paginatedData = React.useMemo(() => {
    if (!enablePagination) return processedData
    
    const start = state.pagination.pageIndex * state.pagination.pageSize
    return processedData.slice(start, start + state.pagination.pageSize)
  }, [processedData, state.pagination, enablePagination])

  // Handle sorting
  const handleSort = (columnId: keyof T) => {
    setState(prev => {
      const existing = prev.sorting.find(s => s.id === columnId)
      let newSorting: { id: keyof T; desc: boolean }[]
      
      if (!existing) {
        newSorting = [{ id: columnId, desc: false }]
      } else if (!existing.desc) {
        newSorting = [{ id: columnId, desc: true }]
      } else {
        newSorting = []
      }
      
      return { ...prev, sorting: newSorting }
    })
  }

  // Handle row selection
  const handleRowSelection = (rowIndex: string, selected: boolean) => {
    setState(prev => {
      const newSelection = { ...prev.rowSelection }
      if (selected) {
        newSelection[rowIndex] = true
      } else {
        delete newSelection[rowIndex]
      }
      return { ...prev, rowSelection: newSelection }
    })
  }

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setState(prev => {
      if (selected) {
        const newSelection: Record<string, boolean> = {}
        paginatedData.forEach((_, index) => {
          newSelection[String(index)] = true
        })
        return { ...prev, rowSelection: newSelection }
      } else {
        return { ...prev, rowSelection: {} }
      }
    })
  }

  // Get selected rows
  const selectedRows = React.useMemo(() => {
    return paginatedData.filter((_, index) => state.rowSelection[String(index)])
  }, [paginatedData, state.rowSelection])

  React.useEffect(() => {
    onRowSelectionChange?.(selectedRows)
  }, [selectedRows, onRowSelectionChange])

  const getSortIcon = (columnId: keyof T) => {
    const sort = state.sorting.find(s => s.id === columnId)
    if (!sort) return <ChevronsUpDown className="h-4 w-4 opacity-50" />
    return sort.desc ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
  }

  const isAllSelected = paginatedData.length > 0 && Object.keys(state.rowSelection).length === paginatedData.length
  const isIndeterminate = Object.keys(state.rowSelection).length > 0 && !isAllSelected

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Global Search */}
          {enableFiltering && (
            <div className="relative max-w-sm">
              <Input
                placeholder="Search all columns..."
                value={state.globalFilter}
                onChange={(e) => setState(prev => ({ ...prev, globalFilter: e.target.value }))}
                className="pl-8"
              />
              <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            </div>
          )}
          
          {/* Selected Count */}
          {enableRowSelection && Object.keys(state.rowSelection).length > 0 && (
            <Badge variant="secondary">
              {Object.keys(state.rowSelection).length} selected
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Column Visibility */}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map(column => (
                  <DropdownMenuCheckboxItem
                    key={String(column.id)}
                    checked={state.columnVisibility[column.id]}
                    onCheckedChange={(checked) => {
                      setState(prev => ({
                        ...prev,
                        columnVisibility: {
                          ...prev.columnVisibility,
                          [column.id]: checked
                        }
                      }))
                    }}
                  >
                    {typeof column.header === 'string' ? column.header : String(column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Export */}
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.(processedData)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="surface-elevated rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {enableRowSelection && (
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                
                {columns.map(column => {
                  if (!state.columnVisibility[column.id]) return null
                  
                  return (
                    <th
                      key={String(column.id)}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right",
                        column.sticky && "sticky left-0 bg-[var(--color-surface-muted)] z-10"
                      )}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth
                      }}
                    >
                      {column.sortable && enableSorting ? (
                        <button
                          onClick={() => handleSort(column.id)}
                          className={cn(
                            "flex items-center gap-2 hover:text-zinc-200 transition-colors group",
                            column.align === 'center' && "justify-center",
                            column.align === 'right' && "justify-end"
                          )}
                        >
                          {column.header}
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                            {getSortIcon(column.id)}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                // Loading skeleton
                Array.from({ length: state.pagination.pageSize }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {enableRowSelection && (
                      <td className="px-4 py-3">
                        <div className="w-4 h-4 bg-[var(--color-surface-muted)] rounded" />
                      </td>
                    )}
                    {columns.map(column => {
                      if (!state.columnVisibility[column.id]) return null
                      return (
                        <td key={String(column.id)} className="px-4 py-3">
                          <div className="h-4 bg-[var(--color-surface-muted)] rounded" />
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty state
                <tr>
                  <td 
                    colSpan={columns.length + (enableRowSelection ? 1 : 0)} 
                    className="px-4 py-12 text-center"
                  >
                    <div className="text-zinc-400">
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                paginatedData.map((item, index) => {
                  const isSelected = state.rowSelection[String(index)]
                  
                  return (
                    <tr
                      key={index}
                      className={cn(
                        "hover:bg-[var(--color-surface-hover)] transition-colors",
                        isSelected && "bg-accent-primary/10"
                      )}
                    >
                      {enableRowSelection && (
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleRowSelection(String(index), checked as boolean)}
                          />
                        </td>
                      )}
                      
                      {columns.map(column => {
                        if (!state.columnVisibility[column.id]) return null
                        
                        const value = column.accessorKey ? item[column.accessorKey] : item[column.id]
                        const content = column.cell ? column.cell(item) : String(value || '')
                        
                        return (
                          <td
                            key={String(column.id)}
                            className={cn(
                              "px-4 py-3 text-sm text-zinc-300",
                              column.align === 'center' && "text-center",
                              column.align === 'right' && "text-right",
                              column.sticky && "sticky left-0 bg-[var(--color-surface)] z-10"
                            )}
                          >
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {enablePagination && processedData.length > state.pagination.pageSize && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                Showing {state.pagination.pageIndex * state.pagination.pageSize + 1} to{' '}
                {Math.min(
                  (state.pagination.pageIndex + 1) * state.pagination.pageSize,
                  processedData.length
                )} of {processedData.length} results
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState(prev => ({
                    ...prev,
                    pagination: { ...prev.pagination, pageIndex: prev.pagination.pageIndex - 1 }
                  }))}
                  disabled={state.pagination.pageIndex === 0}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-zinc-400 px-2">
                  Page {state.pagination.pageIndex + 1} of{' '}
                  {Math.ceil(processedData.length / state.pagination.pageSize)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState(prev => ({
                    ...prev,
                    pagination: { ...prev.pagination, pageIndex: prev.pagination.pageIndex + 1 }
                  }))}
                  disabled={
                    state.pagination.pageIndex >= 
                    Math.ceil(processedData.length / state.pagination.pageSize) - 1
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}