"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { ChevronRight, MoreVertical } from "lucide-react";

/**
 * Mobile-optimized card for list items (properties, tenants, etc.)
 * Features: touch-friendly, swipe actions, responsive layout
 */

interface MobileListCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  showChevron?: boolean;
}

export function MobileListCard({ 
  children, 
  onClick, 
  className,
  showChevron = true 
}: MobileListCardProps): React.ReactElement {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl",
        "transition-all duration-150 active:scale-[0.98] active:bg-[var(--color-hover)]",
        "touch-manipulation cursor-pointer",
        "hover:border-[var(--color-border-hover)] hover:bg-[var(--color-hover)]",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {showChevron && onClick && (
        <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)] flex-shrink-0" />
      )}
    </div>
  );
}

/**
 * Mobile list card with avatar/icon on the left
 */
interface MobileListCardWithIconProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListCardWithIcon({
  icon,
  title,
  subtitle,
  badge,
  rightContent,
  onClick,
  className,
}: MobileListCardWithIconProps): React.ReactElement {
  return (
    <MobileListCard onClick={onClick} className={className} showChevron={!rightContent}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--color-foreground)] truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightContent && (
          <div className="flex-shrink-0 ml-2">
            {rightContent}
          </div>
        )}
      </div>
    </MobileListCard>
  );
}

/**
 * Property card optimized for mobile
 */
interface PropertyMobileCardProps {
  name: string;
  address: string;
  units?: number;
  occupancy?: number;
  revenue?: string;
  onClick?: () => void;
}

export function PropertyMobileCard({
  name,
  address,
  units,
  occupancy,
  revenue,
  onClick,
}: PropertyMobileCardProps): React.ReactElement {
  return (
    <MobileListCard onClick={onClick} className="flex-col items-stretch gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--color-foreground)] truncate">{name}</h3>
          <p className="text-sm text-[var(--color-muted-foreground)] truncate mt-0.5">{address}</p>
        </div>
        {occupancy !== undefined && (
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
            occupancy >= 90 
              ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
              : occupancy >= 70
              ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
              : "bg-[var(--color-error)]/20 text-[var(--color-error)]"
          )}>
            {occupancy}%
          </div>
        )}
      </div>
      
      {(units !== undefined || revenue) && (
        <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)]">
          {units !== undefined && (
            <div className="flex-1">
              <p className="text-xs text-[var(--color-muted-foreground)]">Units</p>
              <p className="text-sm font-medium text-[var(--color-foreground)]">{units}</p>
            </div>
          )}
          {revenue && (
            <div className="flex-1 text-right">
              <p className="text-xs text-[var(--color-muted-foreground)]">Revenue</p>
              <p className="text-sm font-medium text-[var(--color-success)]">{revenue}</p>
            </div>
          )}
        </div>
      )}
    </MobileListCard>
  );
}

/**
 * Tenant card optimized for mobile
 */
interface TenantMobileCardProps {
  name: string;
  email?: string;
  phone?: string;
  property?: string;
  unit?: string;
  status?: "active" | "pending" | "inactive";
  balance?: string;
  onClick?: () => void;
}

export function TenantMobileCard({
  name,
  email,
  phone,
  property,
  unit,
  status = "active",
  balance,
  onClick,
}: TenantMobileCardProps): React.ReactElement {
  const statusColors = {
    active: "bg-[var(--color-success)]/20 text-[var(--color-success)]",
    pending: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
    inactive: "bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)]",
  };

  return (
    <MobileListCard onClick={onClick} className="flex-col items-stretch gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--color-foreground)] truncate">{name}</h3>
          {(property || unit) && (
            <p className="text-sm text-[var(--color-muted-foreground)] truncate mt-0.5">
              {property}{unit ? ` • ${unit}` : ''}
            </p>
          )}
        </div>
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 capitalize",
          statusColors[status]
        )}>
          {status}
        </div>
      </div>
      
      <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)] text-sm">
        {(email || phone) && (
          <div className="flex-1 min-w-0">
            <p className="text-[var(--color-muted-foreground)] truncate">{email || phone}</p>
          </div>
        )}
        {balance && (
          <div className="flex-shrink-0 text-right">
            <p className={cn(
              "font-medium",
              balance.startsWith("-") ? "text-[var(--color-error)]" : "text-[var(--color-success)]"
            )}>
              {balance}
            </p>
          </div>
        )}
      </div>
    </MobileListCard>
  );
}

/**
 * Mobile action button group (for quick actions)
 */
interface MobileActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
}

export function MobileActionButton({
  icon,
  label,
  onClick,
  variant = "default",
}: MobileActionButtonProps): React.ReactElement {
  const variantStyles = {
    default: "bg-[var(--color-hover)] text-[var(--color-foreground)] active:bg-[var(--color-muted)]",
    primary: "bg-accent-primary text-white active:bg-accent-primary/80",
    danger: "bg-[var(--color-error)]/20 text-[var(--color-error)] active:bg-[var(--color-error)]/30",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-w-[72px]",
        "transition-all duration-150 active:scale-95 touch-manipulation",
        variantStyles[variant]
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

/**
 * Horizontal scrollable action bar for mobile
 */
interface MobileActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileActionBar({ children, className }: MobileActionBarProps): React.ReactElement {
  return (
    <div 
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x",
        "-mx-4 px-4 md:mx-0 md:px-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mobile section header with optional action
 */
interface MobileSectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function MobileSectionHeader({ 
  title, 
  action, 
  className 
}: MobileSectionHeaderProps): React.ReactElement {
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-accent-primary hover:text-accent-primary/80 transition-colors touch-manipulation"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for mobile lists
 */
interface MobileEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function MobileEmptyState({
  icon,
  title,
  description,
  action,
}: MobileEmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-[var(--color-hover)] text-[var(--color-muted-foreground)] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "px-4 py-2 rounded-lg bg-accent-primary text-white font-medium",
            "transition-all duration-150 active:scale-95 touch-manipulation"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
