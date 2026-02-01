"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Button } from "./button";
import { Eye, EyeOff, Check, X, AlertCircle, Info, HelpCircle } from "lucide-react";

export interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  showCharCount?: boolean;
  maxLength?: number;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  tooltip?: string;
  variant?: "default" | "ghost" | "filled";
  size?: "sm" | "md" | "lg";
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    label, 
    error, 
    success, 
    hint, 
    showCharCount, 
    maxLength, 
    icon, 
    rightIcon, 
    loading, 
    tooltip,
    variant = "default",
    size = "md",
    type, 
    value, 
    onChange, 
    readOnly, 
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;
    const hasError = !!error;
    const hasSuccess = success && !hasError;
    const charCount = typeof value === 'string' ? value.length : 0;
    const controlledWithoutOnChange = value !== undefined && onChange === undefined && readOnly === undefined;

    const sizeClasses = {
      sm: "h-8 px-2 text-xs",
      md: "h-10 px-3 text-sm",
      lg: "h-12 px-4 text-base"
    };

    const variantClasses = {
      default: "bg-background border-border",
      ghost: "bg-transparent border-transparent",
      filled: "bg-muted border-border"
    };

    const inputClasses = cn(
      "flex w-full rounded-md border shadow-sm transition-all duration-200",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "placeholder:text-muted-foreground",
      "disabled:cursor-not-allowed disabled:opacity-50",
      sizeClasses[size],
      variantClasses[variant],
      {
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2": !hasError && !hasSuccess,
        "border-destructive focus-visible:ring-destructive": hasError,
        "border-green-500 focus-visible:ring-green-500": hasSuccess,
        "hover:border-border/80": !hasError && !hasSuccess && !isFocused,
        "pl-10": icon,
        "pr-10": rightIcon || isPassword || hasError || hasSuccess || loading,
      },
      className
    );

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-2">
            <Label htmlFor={props.id} className="text-sm font-medium">
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {tooltip && (
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          
          <input
            type={actualType}
            className={inputClasses}
            ref={ref}
            value={value}
            onChange={onChange}
            readOnly={controlledWithoutOnChange ? true : readOnly}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            maxLength={maxLength}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
            
            {hasError && !loading && (
              <X className="w-4 h-4 text-destructive" />
            )}
            
            {hasSuccess && !loading && !hasError && (
              <Check className="w-4 h-4 text-green-500" />
            )}
            
            {rightIcon && !hasError && !hasSuccess && !loading && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
            )}
            
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-0 h-auto hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex-1">
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
          
          {showCharCount && maxLength && (
            <div className={cn(
              "text-xs transition-colors duration-200",
              charCount > maxLength * 0.8 ? "text-amber-500" : "text-muted-foreground",
              charCount >= maxLength ? "text-destructive" : ""
            )}>
              {charCount}/{maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";

export interface EnhancedTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  showCharCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  tooltip?: string;
  variant?: "default" | "ghost" | "filled";
  size?: "sm" | "md" | "lg";
}

const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    success, 
    hint, 
    showCharCount, 
    maxLength, 
    autoResize,
    tooltip,
    variant = "default",
    size = "md",
    value, 
    onChange, 
    readOnly, 
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const hasError = !!error;
    const hasSuccess = success && !hasError;
    const charCount = typeof value === 'string' ? value.length : 0;
    const controlledWithoutOnChange = value !== undefined && onChange === undefined && readOnly === undefined;

    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }, [value, autoResize]);

    React.useImperativeHandle(ref, () => textareaRef.current!);

    const sizeClasses = {
      sm: "min-h-[60px] px-2 py-1 text-xs",
      md: "min-h-[80px] px-3 py-2 text-sm",
      lg: "min-h-[100px] px-4 py-3 text-base"
    };

    const variantClasses = {
      default: "bg-background border-border",
      ghost: "bg-transparent border-transparent",
      filled: "bg-muted border-border"
    };

    const textareaClasses = cn(
      "flex w-full rounded-md border shadow-sm transition-all duration-200 resize-none",
      "placeholder:text-muted-foreground",
      "disabled:cursor-not-allowed disabled:opacity-50",
      sizeClasses[size],
      variantClasses[variant],
      {
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2": !hasError && !hasSuccess,
        "border-destructive focus-visible:ring-destructive": hasError,
        "border-green-500 focus-visible:ring-green-500": hasSuccess,
        "hover:border-border/80": !hasError && !hasSuccess && !isFocused,
        "resize-none": autoResize,
        "resize-y": !autoResize,
      },
      className
    );

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-2">
            <Label htmlFor={props.id} className="text-sm font-medium">
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {tooltip && (
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="relative">
          <textarea
            className={textareaClasses}
            ref={textareaRef}
            value={value}
            onChange={onChange}
            readOnly={controlledWithoutOnChange ? true : readOnly}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            maxLength={maxLength}
            {...props}
          />
          
          {(hasError || hasSuccess) && (
            <div className="absolute right-3 top-3">
              {hasError && (
                <X className="w-4 h-4 text-destructive" />
              )}
              
              {hasSuccess && !hasError && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex-1">
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
          
          {showCharCount && maxLength && (
            <div className={cn(
              "text-xs transition-colors duration-200",
              charCount > maxLength * 0.8 ? "text-amber-500" : "text-muted-foreground",
              charCount >= maxLength ? "text-destructive" : ""
            )}>
              {charCount}/{maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
);

EnhancedTextarea.displayName = "EnhancedTextarea";

export { EnhancedInput, EnhancedTextarea };
