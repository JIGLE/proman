"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Button } from "./button";
import { AlertCircle, Check, Info } from "lucide-react";

export interface FormFieldProps {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  required?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ 
  label, 
  error, 
  success, 
  hint, 
  required, 
  tooltip, 
  children, 
  className 
}: FormFieldProps) {
  const hasError = !!error;
  const hasSuccess = success && !hasError;
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {tooltip && (
            <div className="relative group">
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 text-xs text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 max-w-xs">
                {tooltip}
              </div>
            </div>
          )}
        </div>
      )}
      
      {children}
      
      {error && (
        <div className="flex items-center gap-1 text-destructive text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
      
      {hint && !error && (
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Info className="w-3 h-3" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}

export interface FormSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function FormSection({ 
  title, 
  subtitle, 
  children, 
  className,
  collapsible = false,
  defaultCollapsed = false
}: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  
  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{title}</h3>
              {collapsible && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </Button>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      
      {(!collapsible || !isCollapsed) && (
        <div className="space-y-4 border-l-2 border-border pl-4">
          {children}
        </div>
      )}
    </div>
  );
}

export interface FormGridProps {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
  gap?: "sm" | "md" | "lg";
}

export function FormGrid({ 
  columns = 2, 
  children, 
  className,
  gap = "md"
}: FormGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };
  
  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6"
  };
  
  return (
    <div className={cn(
      "grid",
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

export interface FormActionsProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right" | "between";
  className?: string;
  sticky?: boolean;
}

export function FormActions({ 
  children, 
  align = "right", 
  className,
  sticky = false
}: FormActionsProps) {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between"
  };
  
  return (
    <div className={cn(
      "flex items-center gap-3 pt-6 mt-6 border-t border-border",
      alignClasses[align],
      sticky && "sticky bottom-0 bg-background/80 backdrop-blur-sm",
      className
    )}>
      {children}
    </div>
  );
}

export interface FormProgressProps {
  steps: string[];
  currentStep: number;
  className?: string;
  variant?: "dots" | "line" | "numbered";
}

export function FormProgress({ 
  steps, 
  currentStep, 
  className,
  variant = "dots"
}: FormProgressProps) {
  if (variant === "line") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="font-medium">{steps[currentStep]}</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }
  
  if (variant === "numbered") {
    return (
      <div className={cn("flex items-center justify-between", className)}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          
          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center space-y-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                  {
                    "bg-primary text-primary-foreground": isCompleted || isCurrent,
                    "bg-muted text-muted-foreground": isUpcoming,
                    "ring-2 ring-primary ring-offset-2": isCurrent
                  }
                )}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "text-xs text-center max-w-[80px] leading-tight",
                  {
                    "text-foreground font-medium": isCurrent,
                    "text-muted-foreground": !isCurrent
                  }
                )}>
                  {step}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-4 transition-colors duration-200",
                  index < currentStep ? "bg-primary" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-200",
              {
                "bg-primary": isCompleted || isCurrent,
                "bg-border": index > currentStep,
                "ring-2 ring-primary ring-offset-2": isCurrent
              }
            )}
            title={step}
          />
        );
      })}
    </div>
  );
}