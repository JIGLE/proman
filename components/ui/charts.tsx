import * as React from "react"
import { cn } from "@/lib/utils/utils"
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from "lucide-react"

interface ChartDataPoint {
  label: string
  value: number
  color?: string
  trend?: number
}

interface ChartProps {
  data: ChartDataPoint[]
  title?: string
  subtitle?: string
  height?: number
  className?: string
  showTrend?: boolean
  showValues?: boolean
  type?: 'bar' | 'line' | 'pie' | 'area'
}

// Simple Bar Chart Component
export function BarChart({ 
  data, 
  title, 
  subtitle, 
  height: _height = 200, 
  className, 
  showTrend = false,
  showValues = true 
}: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue

  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-heading-medium font-semibold text-zinc-50 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent-primary" />
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-body-small text-zinc-400">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {data.map((item, _index) => {
          const percentage = range > 0 ? ((item.value - minValue) / range) * 100 : 0
          
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  {showValues && (
                    <span className="text-zinc-50 font-semibold">
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </span>
                  )}
                  {showTrend && item.trend && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      item.trend > 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {item.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(item.trend)}%
                    </div>
                  )}
                </div>
              </div>
              
              <div className="relative h-2 bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    item.color ? `bg-[${item.color}]` : "bg-accent-primary"
                  )}
                  style={{ 
                    width: `${Math.max(percentage, 2)}%`,
                    backgroundColor: item.color || 'var(--color-accent-primary)'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Simple Line Chart Component
export function LineChart({ 
  data, 
  title, 
  subtitle, 
  height = 200, 
  className,
  showValues = false
}: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  const padding = height * 0.1
  const _chartHeight = height - padding * 2

  const points = data.map((item, _index) => {
    const x = (_index / (data.length - 1)) * 100
    const y = ((maxValue - item.value) / range) * 100
    return { x, y, ...item }
  })

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-heading-medium font-semibold text-zinc-50 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent-primary" />
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-body-small text-zinc-400">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="overflow-visible"
        >
          {/* Grid Lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Chart Line */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--color-accent-primary)"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Data Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="var(--color-accent-primary)"
                className="drop-shadow-sm hover:r-4 transition-all cursor-pointer"
              />
              {showValues && (
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  className="text-xs fill-zinc-300 font-medium"
                >
                  {point.value}
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* X-Axis Labels */}
        <div className="flex justify-between mt-2 px-1">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-zinc-400 font-medium">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Donut Chart Component
export function DonutChart({ 
  data, 
  title, 
  subtitle, 
  height = 200, 
  className 
}: ChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  
  let accumulatedAngle = 0

  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-heading-medium font-semibold text-zinc-50 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-accent-primary" />
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-body-small text-zinc-400">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-6">
        {/* Chart */}
        <div className="relative" style={{ width: height, height }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const strokeDasharray = `${percentage * circumference / 100} ${circumference}`
              const strokeDashoffset = -accumulatedAngle * circumference / 100
              
              accumulatedAngle += percentage
              
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={item.color || `hsl(${index * 60}, 60%, 60%)`}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                  transform="rotate(-90 50 50)"
                />
              )
            })}
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-display-small font-bold text-zinc-50">
              {total.toLocaleString()}
            </span>
            <span className="text-caption text-zinc-400">Total</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-2 flex-1">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            
            return (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || `hsl(${index * 60}, 60%, 60%)` }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-zinc-300 font-medium">{item.label}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-zinc-50">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-400">{percentage}%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Area Chart Component
export function AreaChart({ 
  data, 
  title, 
  subtitle, 
  height = 200, 
  className,
  showValues = false
}: ChartProps) {
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  const padding = 10
  
  // Calculate points for the area
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (100 - padding * 2)
    const normalizedValue = ((item.value - minValue) / range)
    const y = 100 - padding - normalizedValue * (100 - padding * 2)
    return { x, y, ...item }
  })

  // Create SVG path for the line
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  // Create SVG path for the filled area
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${100 - padding} L ${padding} ${100 - padding} Z`

  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-heading-medium font-semibold text-zinc-50 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent-primary" />
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-body-small text-zinc-400">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className="relative" style={{ height }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1={padding}
              y1={y}
              x2={100 - padding}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
          
          {/* Filled Area */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            className="transition-all duration-1000 ease-out"
          />
          
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-accent-primary)"
            strokeWidth="2"
            className="drop-shadow-sm transition-all duration-1000 ease-out"
          />
          
          {/* Data Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="var(--color-surface)"
                stroke="var(--color-accent-primary)"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              {showValues && (
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  className="text-xs fill-zinc-300 font-medium"
                >
                  {point.value}
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* X-Axis Labels */}
        <div className="flex justify-between mt-2 px-2">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-zinc-400 font-medium">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Metric Card with Chart
interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  chart?: React.ReactNode
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  chart,
  className
}: MetricCardProps) {
  return (
    <div className={cn(
      "surface-elevated rounded-lg border border-[var(--color-border)] p-6 transition-all duration-200 hover-lift",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <p className="text-heading-small font-medium text-zinc-400">{title}</p>
          <p className="text-display-medium font-bold text-zinc-50">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        
        {icon && (
          <div className="p-2 rounded-lg bg-accent-primary/10">
            {icon}
          </div>
        )}
      </div>
      
      {(change !== undefined || changeLabel) && (
        <div className="flex items-center gap-2 mb-4">
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-zinc-400"
            )}>
              {change > 0 && <TrendingUp className="h-4 w-4" />}
              {change < 0 && <TrendingDown className="h-4 w-4" />}
              {Math.abs(change)}%
            </div>
          )}
          {changeLabel && (
            <span className="text-sm text-zinc-400">{changeLabel}</span>
          )}
        </div>
      )}
      
      {chart && (
        <div className="mt-4">
          {chart}
        </div>
      )}
    </div>
  )
}
