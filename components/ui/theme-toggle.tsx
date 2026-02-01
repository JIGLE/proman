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
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "button" | "dropdown";
  size?: "sm" | "default" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ 
  variant = "button", 
  size = "default",
  className,
  showLabel = false 
}: ThemeToggleProps): React.ReactElement {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size={size === "sm" ? "sm" : "icon"}
        onClick={toggleTheme}
        className={cn(
          "transition-colors",
          size === "sm" && "h-8 w-8",
          className
        )}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <Sun className={cn(
          "h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0",
          size === "lg" && "h-5 w-5"
        )} />
        <Moon className={cn(
          "absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100",
          size === "lg" && "h-5 w-5"
        )} />
        {showLabel && (
          <span className="ml-2">
            {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
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
          className={cn(
            "transition-colors",
            size === "sm" && "h-8 w-8",
            className
          )}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "bg-[var(--color-accent)]/20 text-accent-primary")}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "bg-[var(--color-accent)]/20 text-accent-primary")}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark-oled")}
          className={cn(theme === "dark-oled" && "bg-[var(--color-accent)]/20 text-accent-primary")}
        >
          <Moon className="mr-2 h-4 w-4 fill-current" />
          <span>OLED Black</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "bg-[var(--color-accent)]/20 text-accent-primary")}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
