"use client";

import { cn } from "@/lib/utils/utils";
import { Building2, Users, FileText, Wrench, Calendar, AlertCircle } from "lucide-react";

type BadgeVariant = "property" | "tenant" | "lease" | "maintenance" | "expiry" | "overdue";

const VARIANT_CONFIG: Record<
  BadgeVariant,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  property: { icon: Building2, className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  tenant: { icon: Users, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  lease: { icon: FileText, className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  maintenance: { icon: Wrench, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  expiry: { icon: Calendar, className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  overdue: { icon: AlertCircle, className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

interface RelationshipBadgeProps {
  variant: BadgeVariant;
  label: string;
  count?: number;
  className?: string;
}

export function RelationshipBadge({ variant, label, count, className }: RelationshipBadgeProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        config.className,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {count !== undefined ? (
        <span>
          {count} {label}
        </span>
      ) : (
        <span className="truncate max-w-[120px]">{label}</span>
      )}
    </span>
  );
}

/**
 * Helper to compute days until a date. Returns null if date is invalid.
 */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
