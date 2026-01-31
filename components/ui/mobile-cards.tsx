"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
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
        "relative flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl",
        "transition-all duration-150 active:scale-[0.98] active:bg-zinc-800",
        "touch-manipulation cursor-pointer",
        "hover:border-zinc-700 hover:bg-zinc-800/50",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {showChevron && onClick && (
        <ChevronRight className="h-5 w-5 text-zinc-500 flex-shrink-0" />
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
            <h3 className="text-sm font-medium text-zinc-50 truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">{subtitle}</p>
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
          <h3 className="text-base font-semibold text-zinc-50 truncate">{name}</h3>
          <p className="text-sm text-zinc-400 truncate mt-0.5">{address}</p>
        </div>
        {occupancy !== undefined && (
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
            occupancy >= 90 
              ? "bg-green-500/20 text-green-400"
              : occupancy >= 70
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"
          )}>
            {occupancy}%
          </div>
        )}
      </div>
      
      {(units !== undefined || revenue) && (
        <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
          {units !== undefined && (
            <div className="flex-1">
              <p className="text-xs text-zinc-500">Units</p>
              <p className="text-sm font-medium text-zinc-200">{units}</p>
            </div>
          )}
          {revenue && (
            <div className="flex-1 text-right">
              <p className="text-xs text-zinc-500">Revenue</p>
              <p className="text-sm font-medium text-green-400">{revenue}</p>
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
    active: "bg-green-500/20 text-green-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    inactive: "bg-zinc-500/20 text-zinc-400",
  };

  return (
    <MobileListCard onClick={onClick} className="flex-col items-stretch gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-50 truncate">{name}</h3>
          {(property || unit) && (
            <p className="text-sm text-zinc-400 truncate mt-0.5">
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
      
      <div className="flex items-center gap-4 pt-2 border-t border-zinc-800 text-sm">
        {(email || phone) && (
          <div className="flex-1 min-w-0">
            <p className="text-zinc-400 truncate">{email || phone}</p>
          </div>
        )}
        {balance && (
          <div className="flex-shrink-0 text-right">
            <p className={cn(
              "font-medium",
              balance.startsWith("-") ? "text-red-400" : "text-green-400"
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
    default: "bg-zinc-800 text-zinc-200 active:bg-zinc-700",
    primary: "bg-accent-primary text-white active:bg-accent-primary/80",
    danger: "bg-red-500/20 text-red-400 active:bg-red-500/30",
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
      <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
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
      <div className="p-4 rounded-full bg-zinc-800 text-zinc-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 mb-4 max-w-xs">{description}</p>
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
