"use client";

import * as React from "react";
import { Home, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import Link from "next/link";

/**
 * Page Header Component - Enforces consistent page headers across all page types
 * 
 * Required for all page types:
 * - Dashboard: Title + optional date range
 * - List View: Title + primary action (Add button)
 * - Detail View: Entity name + breadcrumb + status + actions
 * - Form: "Create/Edit [Entity]" + breadcrumb
 * - Report: Title + filters + export
 * - Settings: Category title
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}

export interface PageHeaderProps {
  /** Page title - required for all pages */
  title: string;
  /** Subtitle/description - optional */
  description?: string;
  /** Breadcrumb trail - for context navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Primary action button (top-right) - max 1 */
  primaryAction?: PageHeaderAction;
  /** Secondary actions (top-right, after primary) - max 2 */
  secondaryActions?: PageHeaderAction[];
  /** Show refresh button */
  showRefresh?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Custom children rendered after description */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions = [],
  showRefresh = false,
  onRefresh,
  children,
  className,
}: PageHeaderProps): React.ReactElement {
  // Enforce max 2 secondary actions
  const visibleSecondaryActions = secondaryActions.slice(0, 2);

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
            <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="h-3.5 w-3.5" />
                {crumb.href ? (
                  <Link 
                    href={crumb.href}
                    className="hover:text-[var(--color-foreground)] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--color-foreground)]">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {description}
          </p>
        )}

        {/* Custom content */}
        {children}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Refresh button */}
        {showRefresh && onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}

        {/* Secondary actions */}
        {visibleSecondaryActions.map((action, index) => (
          action.href ? (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              disabled={action.disabled}
              asChild
            >
              <Link href={action.href}>
                {action.icon}
                <span className={cn(action.icon && "ml-2")}>{action.label}</span>
              </Link>
            </Button>
          ) : (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          )
        ))}

        {/* Primary action - always rightmost, highlighted */}
        {primaryAction && (
          primaryAction.href ? (
            <Button
              variant={primaryAction.variant || "default"}
              size="sm"
              disabled={primaryAction.disabled}
              asChild
            >
              <Link href={primaryAction.href}>
                {primaryAction.icon}
                <span className={cn(primaryAction.icon && "ml-2")}>{primaryAction.label}</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant={primaryAction.variant || "default"}
              size="sm"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="gap-2"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Page Container - Wraps page content with consistent padding and max-width
 */
export interface PageContainerProps {
  children: React.ReactNode;
  /** Maximum width variant */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  /** Additional class names */
  className?: string;
}

export function PageContainer({
  children,
  maxWidth = "full",
  className,
}: PageContainerProps): React.ReactElement {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "w-full",
  };

  return (
    <div className={cn("space-y-6", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}

/**
 * Empty State Component - Consistent empty state display
 */
export interface EmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Additional class names */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      "bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]",
      className
    )}>
      {icon && (
        <div className="mb-4 text-[var(--color-muted-foreground)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-[var(--color-foreground)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4 max-w-md">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

export default PageHeader;
