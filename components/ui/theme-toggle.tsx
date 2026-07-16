"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useTheme } from "@/lib/contexts/theme-context";
import { cn } from "@/lib/utils/utils";

interface ThemeToggleProps {
  variant?: "button" | "dropdown";
  size?: "sm" | "default" | "lg";
  className?: string;
  showLabel?: boolean;
}

/**
 * Mode toggle for the Situs matched themes: Normal / Dark / System.
 * Country selection is a Settings concern (Appearance tab), not a toggle.
 */
export function ThemeToggle({
  variant = "button",
  size = "default",
  className,
  showLabel = false,
}: ThemeToggleProps): React.ReactElement {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size={size === "sm" ? "sm" : "icon"}
        onClick={toggleTheme}
        className={cn("transition-colors", size === "sm" && "h-8 w-8", className)}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "normal" : "dark"} mode`}
      >
        {resolvedTheme === "dark" ? (
          <Moon className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
        ) : (
          <Sun className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
        )}
        {showLabel && (
          <span className="ml-2">
            {resolvedTheme === "dark" ? "Matched Normal" : "Matched Dark"}
          </span>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "icon"}
          className={cn("transition-colors", size === "sm" && "h-8 w-8", className)}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem
          onClick={() => setTheme("normal")}
          className={cn(theme === "normal" && "bg-[var(--color-hover)] text-accent-primary")}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Matched Normal</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "bg-[var(--color-hover)] text-accent-primary")}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Matched Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "bg-[var(--color-hover)] text-accent-primary")}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
