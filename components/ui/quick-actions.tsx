"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowRight,
  Sparkles,
  MoreHorizontal,
  Building2,
  DollarSign,
  FileText,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useMagneticHover } from "@/lib/hooks/use-magnetic-hover";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface QuickAction<T extends string = string> {
  id: T;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  shortcut?: string;
}

interface QuickActionsProps<T extends string = string> {
  actions: QuickAction<T>[];
  onAction: (id: T) => void;
  className?: string;
  variant?: "grid" | "horizontal" | "compact";
  showOverflowOnly?: boolean;
  /** Number of primary actions to show before overflow (default: 2) */
  overflowAfter?: number;
  /** Title for the card header (default: "Quick Actions") */
  title?: string;
}

function MagneticGridCard<T extends string>({
  action,
  index,
  onAction,
}: {
  action: QuickAction<T>;
  index: number;
  onAction: (id: T) => void;
}) {
  const { ref, onMouseMove, onMouseLeave } =
    useMagneticHover<HTMLButtonElement>();
  const Icon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <button
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={() => onAction(action.id)}
        className={cn(
          "group relative flex flex-col items-start p-4 rounded-xl w-full",
          "border border-[var(--color-border)]",
          "bg-[var(--color-background)]",
          "hover:bg-[var(--color-hover)] hover:border-[var(--color-accent)]/50",
          "hover:shadow-[var(--shadow-glow)]",
          "transition-all duration-200",
          "active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
        )}
      >
        <div className={cn("p-2 rounded-lg mb-3", action.bgColor)}>
          <Icon className={cn("h-5 w-5", action.color)} />
        </div>
        <span className="text-sm font-medium text-[var(--color-foreground)] mb-1">
          {action.label}
        </span>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {action.description}
        </span>
        {action.shortcut && (
          <kbd className="absolute top-2 right-2 hidden md:inline-flex h-5 items-center px-1.5 rounded border border-[var(--color-border)] bg-[var(--color-background)] text-[10px] font-mono text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity">
            {action.shortcut}
          </kbd>
        )}
        <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </button>
    </motion.div>
  );
}

export function QuickActions<T extends string = string>({
  actions,
  onAction,
  className,
  variant = "grid",
  showOverflowOnly = false,
  overflowAfter = 2,
  title = "Quick Actions",
}: QuickActionsProps<T>): React.ReactElement {
  // Overflow-only mode: shows remaining actions (excluding first N which are shown as primary buttons)
  if (showOverflowOnly) {
    const overflowActions = actions.slice(overflowAfter);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 w-9 p-0", className)}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {overflowActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => onAction(action.id)}
              >
                <Icon className={cn("h-4 w-4 mr-2", action.color)} />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "horizontal") {
    return (
      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-2 scrollbar-hide",
          className,
        )}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(action.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  "border-[var(--color-border)] hover:border-[var(--color-accent)]/50",
                  "transition-all duration-200",
                )}
              >
                <Icon className={cn("h-4 w-4", action.color)} />
                <span>{action.label}</span>
              </Button>
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "bg-[var(--color-card)] border-[var(--color-border)]",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[var(--color-foreground)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {actions.slice(0, 4).map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onAction(action.id)}
                  className={cn(
                    "h-8 px-2",
                    action.bgColor,
                    "border border-transparent",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 mr-1.5", action.color)} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default grid variant
  return (
    <Card
      className={cn(
        "bg-[var(--color-card)] border-[var(--color-border)]",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="text-[var(--color-foreground)] flex items-center gap-2">
          <Plus className="h-5 w-5 text-[var(--color-accent)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <MagneticGridCard
              key={action.id}
              action={action}
              index={index}
              onAction={onAction}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Attention needed panel component
interface AttentionItem {
  id: string;
  type: "overdue" | "expiring" | "maintenance" | "vacancy";
  title: string;
  description: string;
  count?: number;
  urgency: "low" | "medium" | "high";
  action?: () => void;
  actionLabel?: string;
}

interface AttentionNeededProps {
  items: AttentionItem[];
  className?: string;
  onViewAll?: () => void;
}

const urgencyColors = {
  low: "border-l-blue-400 bg-blue-500/5",
  medium: "border-l-yellow-400 bg-yellow-500/5",
  high: "border-l-red-400 bg-red-500/5",
};

const typeIcons = {
  overdue: DollarSign,
  expiring: FileText,
  maintenance: Wrench,
  vacancy: Building2,
};

export function AttentionNeeded({
  items,
  className,
  onViewAll,
}: AttentionNeededProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <Card
        className={cn(
          "bg-[var(--color-card)] border-[var(--color-border)]",
          className,
        )}
      >
        <CardContent className="py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
            <Sparkles className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            All caught up!
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            No items need your attention right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "bg-[var(--color-card)] border-[var(--color-border)]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-[var(--color-foreground)] flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Attention Needed
          <span className="text-xs text-[var(--color-muted-foreground)] font-normal">
            ({items.length})
          </span>
        </CardTitle>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs"
          >
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.slice(0, 5).map((item, index) => {
          const Icon = typeIcons[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-l-4",
                urgencyColors[item.urgency],
              )}
            >
              <Icon className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                    {item.title}
                  </p>
                  {item.count && item.count > 1 && (
                    <span className="text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)]/20 px-1.5 py-0.5 rounded">
                      {item.count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                  {item.description}
                </p>
              </div>
              {item.action && item.actionLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={item.action}
                  className="text-xs shrink-0"
                >
                  {item.actionLabel}
                </Button>
              )}
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
