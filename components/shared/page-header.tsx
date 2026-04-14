"use client";

import React from "react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "ghost" | "destructive";
  /** Primary actions appear as prominent buttons */
  primary?: boolean;
}

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Action buttons displayed on the right */
  actions?: PageHeaderAction[];
  /** Custom content to render in the action area (e.g., search, export) */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {children}

          {actions?.map((action, i) => {
            const Icon = action.icon;
            return (
              <Button
                key={i}
                variant={action.primary ? "default" : action.variant || "outline"}
                size="sm"
                onClick={action.onClick}
                className={cn(
                  action.primary &&
                    "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white",
                )}
              >
                {Icon && <Icon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
