import * as React from "react";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export type StatTone = "default" | "success" | "warning" | "danger" | "info";

const TONE_SURFACE: Record<StatTone, string> = {
  default: "border-[var(--color-border)] bg-[var(--color-card)]",
  success: "border-[var(--color-success)]/20 bg-[var(--color-success-muted)]",
  warning: "border-[var(--color-warning)]/20 bg-[var(--color-warning-muted)]",
  danger: "border-[var(--color-destructive)]/20 bg-[var(--color-error-muted)]",
  info: "border-[var(--color-info)]/20 bg-[var(--color-info-muted)]",
};

const TONE_VALUE: Record<StatTone, string> = {
  default: "text-[var(--color-foreground)]",
  success: "text-[var(--color-success)]",
  warning: "text-[var(--color-warning)]",
  danger: "text-[var(--color-destructive)]",
  info: "text-[var(--color-info)]",
};

export interface StatTrend {
  /** Numeric change, e.g. 8 for +8% */
  value: number;
  direction: "up" | "down" | "flat";
  /** Human-readable context, e.g. "vs last month" */
  label?: string;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional secondary line under the value. */
  hint?: ReactNode;
  /** Trend badge shown below the value (Revolut-style data storytelling). */
  trend?: StatTrend;
  icon?: ElementType;
  tone?: StatTone;
  /** Tint the value text with the tone color (default keeps it neutral). */
  emphasizeValue?: boolean;
  /** "compact" drops the icon and uses tighter padding (dashboard KPI row). */
  size?: "default" | "compact";
  /** Makes the whole card a link. */
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * The single KPI/metric primitive for the app. Replaces the ad-hoc inline
 * metric divs (dashboard), TenantStatCard (assets) and MetricCard so every
 * "number" reads the same way. Tone drives both the surface tint and,
 * optionally, the value color.
 */
function TrendBadge({ trend }: { trend: StatTrend }) {
  const TrendIcon =
    trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const colorClass =
    trend.direction === "up"
      ? "text-[var(--color-success)]"
      : trend.direction === "down"
        ? "text-[var(--color-destructive)]"
        : "text-[var(--color-muted-foreground)]";
  const sign = trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
  return (
    <p className={cn("mt-1.5 flex items-center gap-1 text-xs", colorClass)}>
      <TrendIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>
        {sign}
        {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ""}
      </span>
    </p>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  tone = "default",
  emphasizeValue = false,
  size = "default",
  href,
  onClick,
  className,
}: StatCardProps): React.ReactElement {
  const compact = size === "compact";
  const interactive = Boolean(href || onClick);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
        {Icon && !compact && (
          <span className="rounded-lg bg-[var(--color-surface-hover)] p-2">
            <Icon className="h-4 w-4 text-[var(--color-foreground)]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 font-semibold tracking-tight",
          compact ? "text-xl" : "text-2xl",
          emphasizeValue ? TONE_VALUE[tone] : "text-[var(--color-foreground)]",
        )}
        aria-live="polite"
      >
        {value}
      </p>
      {trend && <TrendBadge trend={trend} />}
      {hint && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
    </>
  );

  const baseClass = cn(
    "rounded-xl border p-4 text-left transition-colors",
    compact ? "p-4" : "sm:p-5",
    TONE_SURFACE[tone],
    interactive &&
      "hover:border-[var(--color-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn("block", baseClass)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("w-full", baseClass)}>
        {body}
      </button>
    );
  }
  return <div className={baseClass}>{body}</div>;
}

interface StatGridProps {
  /** Column count at the largest breakpoint (responsive down to 1–2). */
  cols?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}

const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

/** Responsive grid wrapper for StatCards. */
export function StatGrid({ cols = 3, children, className }: StatGridProps): React.ReactElement {
  return <div className={cn("grid gap-3", GRID_COLS[cols], className)}>{children}</div>;
}
