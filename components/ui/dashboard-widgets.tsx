import * as React from "react"
import { LucideIcon, MoreVertical, Maximize2, Minimize2, RefreshCw, Download, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./dropdown-menu"
import { Badge } from "./badge"

interface WidgetProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  value?: string | number
  change?: {
    value: number
    label?: string
    period?: string
  }
  className?: string
  loading?: boolean
  error?: string
  onRefresh?: () => void
  onExport?: () => void
  onExpand?: () => void
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'outlined' | 'elevated'
  actions?: React.ReactNode
}

export function DashboardWidget({
  title,
  subtitle,
  icon: Icon,
  value,
  change,
  className,
  loading = false,
  error,
  onRefresh,
  onExport,
  onExpand,
  children,
  size = 'md',
  variant = 'elevated',
  actions
}: WidgetProps) {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  const variantClasses = {
    default: '',
    outlined: 'border-2',
    elevated: 'surface-elevated shadow-lg'
  }

  return (
    <Card className={cn(
      'transition-all duration-200 hover-lift group',
      variantClasses[variant],
      className
    )}>
      <CardHeader className={cn(
        'flex flex-row items-start justify-between space-y-0',
        sizeClasses[size]
      )}>
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-2 rounded-lg bg-accent-primary/10 group-hover:bg-accent-primary/20 transition-colors">
                <Icon className="h-4 w-4 text-accent-primary" />
              </div>
            )}
            <CardTitle className="text-heading-medium font-semibold text-zinc-50">
              {title}
            </CardTitle>
          </div>
          
          {subtitle && (
            <p className="text-body-small text-zinc-400">{subtitle}</p>
          )}
          
          {value && (
            <div className="space-y-2">
              <p className="text-display-medium font-bold text-zinc-50">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              
              {change && (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    change.value > 0 ? "text-green-400" : 
                    change.value < 0 ? "text-red-400" : "text-zinc-400"
                  )}>
                    {change.value > 0 && <TrendingUp className="h-3 w-3" />}
                    {change.value < 0 && <TrendingDown className="h-3 w-3" />}
                    {Math.abs(change.value).toFixed(1)}%
                  </div>
                  
                  <span className="text-xs text-zinc-500">
                    {change.label} {change.period && `vs ${change.period}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Widget Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRefresh && (
                <DropdownMenuItem onClick={onRefresh} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </DropdownMenuItem>
              )}
              {onExpand && (
                <DropdownMenuItem onClick={onExpand} className="gap-2">
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </DropdownMenuItem>
              )}
              {onExport && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onExport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Data
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      {(children || loading || error) && (
        <CardContent className={cn('pt-0', sizeClasses[size])}>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-sm text-red-400 mb-2">Error loading data</p>
                <p className="text-xs text-zinc-500">{error}</p>
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {!loading && !error && children}
        </CardContent>
      )}
    </Card>
  )
}

// Pre-built widget variants
interface StatWidgetProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  className?: string
  color?: string
}

export function StatWidget({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon: Icon,
  className,
  color = "var(--color-accent-primary)"
}: StatWidgetProps) {
  return (
    <DashboardWidget
      title={title}
      value={value}
      change={change ? {
        value: change,
        label: changeLabel
      } : undefined}
      icon={Icon}
      className={className}
      size="sm"
    />
  )
}

interface ChartWidgetProps {
  title: string
  subtitle?: string
  chart: React.ReactNode
  className?: string
  onRefresh?: () => void
  onExport?: () => void
  loading?: boolean
  error?: string
}

export function ChartWidget({
  title,
  subtitle,
  chart,
  className,
  onRefresh,
  onExport,
  loading,
  error
}: ChartWidgetProps) {
  return (
    <DashboardWidget
      title={title}
      subtitle={subtitle}
      className={className}
      onRefresh={onRefresh}
      onExport={onExport}
      loading={loading}
      error={error}
      size="lg"
    >
      {chart}
    </DashboardWidget>
  )
}

interface ListWidgetProps<T> {
  title: string
  subtitle?: string
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
  showAll?: boolean
  onSeeMore?: () => void
  loading?: boolean
}

export function ListWidget<T>({
  title,
  subtitle,
  items,
  renderItem,
  className,
  emptyMessage = "No items to display",
  showAll = false,
  onSeeMore,
  loading = false
}: ListWidgetProps<T>) {
  const displayItems = showAll ? items : items.slice(0, 5)
  const hasMore = items.length > 5 && !showAll

  return (
    <DashboardWidget
      title={title}
      subtitle={subtitle}
      className={className}
      loading={loading}
      size="md"
    >
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item, index) => (
            <div key={index} className="border-l-2 border-transparent hover:border-accent-primary transition-colors">
              <div className="pl-3">
                {renderItem(item, index)}
              </div>
            </div>
          ))}
          
          {hasMore && onSeeMore && (
            <Button variant="ghost" size="sm" onClick={onSeeMore} className="w-full mt-4">
              Show {items.length - 5} more items
            </Button>
          )}
        </div>
      )}
    </DashboardWidget>
  )
}

// Widget Grid Layout
interface DashboardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 6
  gap?: 2 | 3 | 4 | 6 | 8
  className?: string
}

export function DashboardGrid({
  children,
  columns = 3,
  gap = 6,
  className
}: DashboardGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    6: 'md:grid-cols-3 lg:grid-cols-6'
  }

  const gapClasses = {
    2: 'gap-2',
    3: 'gap-3', 
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  }

  return (
    <div className={cn(
      'grid',
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}