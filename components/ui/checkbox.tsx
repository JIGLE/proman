import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Minus } from "lucide-react"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, onCheckedChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded-sm border border-zinc-300 bg-background",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
            "data-[state=checked]:border-primary",
            props.checked && "bg-primary border-primary",
            className
          )}
          data-state={
            indeterminate ? "indeterminate" : props.checked ? "checked" : "unchecked"
          }
        >
          {indeterminate ? (
            <Minus className="h-3 w-3 text-white" />
          ) : props.checked ? (
            <Check className="h-3 w-3 text-white" />
          ) : null}
        </div>
      </label>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }