"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Receipt,
  FileText,
  Wrench,
  Mail,
  BarChart3,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/utils";

export interface EmptyStateIllustrationProps {
  /** Which entity type this empty state is for */
  type:
    | "properties"
    | "tenants"
    | "payments"
    | "leases"
    | "maintenance"
    | "correspondence"
    | "reports"
    | "generic";
  /** Title override (defaults based on type) */
  title?: string;
  /** Description override (defaults based on type) */
  description?: string;
  /** Primary CTA callback */
  onAction?: () => void;
  /** Primary CTA label override */
  actionLabel?: string;
  /** Secondary CTA callback */
  onSecondaryAction?: () => void;
  /** Secondary CTA label */
  secondaryActionLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode (less padding/smaller) */
  compact?: boolean;
}

const emptyStateConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    actionLabel: string;
    gradient: string;
    accentColor: string;
  }
> = {
  properties: {
    icon: Building2,
    title: "No properties yet",
    description:
      "Add your first property to start managing your portfolio. Track occupancy, revenue, and maintenance all in one place.",
    actionLabel: "Add Property",
    gradient: "from-blue-500/20 to-indigo-500/20",
    accentColor: "text-blue-400",
  },
  tenants: {
    icon: Users,
    title: "No tenants yet",
    description:
      "Once you have properties set up, add tenants to track leases, payments, and communications.",
    actionLabel: "Add Tenant",
    gradient: "from-emerald-500/20 to-teal-500/20",
    accentColor: "text-emerald-400",
  },
  payments: {
    icon: Receipt,
    title: "No payments recorded",
    description:
      "Start recording rent payments to track your revenue and generate financial reports automatically.",
    actionLabel: "Record Payment",
    gradient: "from-amber-500/20 to-orange-500/20",
    accentColor: "text-amber-400",
  },
  leases: {
    icon: FileText,
    title: "No leases created",
    description:
      "Create lease agreements to formalize tenant relationships and automate renewal reminders.",
    actionLabel: "Create Lease",
    gradient: "from-violet-500/20 to-purple-500/20",
    accentColor: "text-violet-400",
  },
  maintenance: {
    icon: Wrench,
    title: "No maintenance requests",
    description:
      "When tenants report issues, they'll appear here. You can also create tickets proactively.",
    actionLabel: "Create Ticket",
    gradient: "from-rose-500/20 to-pink-500/20",
    accentColor: "text-rose-400",
  },
  correspondence: {
    icon: Mail,
    title: "No correspondence yet",
    description:
      "Send notices, reminders, and updates to your tenants. All communication history is tracked here.",
    actionLabel: "Send Message",
    gradient: "from-cyan-500/20 to-sky-500/20",
    accentColor: "text-cyan-400",
  },
  reports: {
    icon: BarChart3,
    title: "No reports available",
    description:
      "Reports are generated from your property and financial data. Add properties and record payments to unlock insights.",
    actionLabel: "Get Started",
    gradient: "from-lime-500/20 to-green-500/20",
    accentColor: "text-lime-400",
  },
  generic: {
    icon: Plus,
    title: "Nothing here yet",
    description: "Get started by adding your first item.",
    actionLabel: "Add New",
    gradient: "from-zinc-500/20 to-zinc-400/20",
    accentColor: "text-zinc-400",
  },
};

export function EmptyStateIllustration({
  type,
  title,
  description,
  onAction,
  actionLabel,
  onSecondaryAction,
  secondaryActionLabel,
  className,
  compact = false,
}: EmptyStateIllustrationProps): React.ReactElement {
  const config = emptyStateConfig[type] || emptyStateConfig.generic;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
    >
      {/* Animated Icon with gradient background */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative rounded-2xl bg-gradient-to-br p-6 mb-6",
          config.gradient
        )}
      >
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-2xl border border-[var(--color-border)] opacity-50" />
        
        {/* Floating particles (decorative) */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon
            className={cn(
              config.accentColor,
              compact ? "h-10 w-10" : "h-14 w-14"
            )}
          />
        </motion.div>

        {/* Small decorative dots */}
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className={cn(
            "absolute -top-1 -right-1 h-3 w-3 rounded-full",
            config.accentColor.replace("text-", "bg-")
          )}
        />
        <motion.div
          animate={{ opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          className={cn(
            "absolute -bottom-1 -left-1 h-2 w-2 rounded-full",
            config.accentColor.replace("text-", "bg-")
          )}
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "font-semibold text-[var(--color-foreground)] mb-2",
          compact ? "text-base" : "text-lg"
        )}
      >
        {title || config.title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "text-[var(--color-muted-foreground)] mb-6 max-w-sm",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description || config.description}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3"
      >
        {onAction && (
          <Button onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel || config.actionLabel}
          </Button>
        )}
        {onSecondaryAction && secondaryActionLabel && (
          <Button variant="outline" onClick={onSecondaryAction} className="gap-2">
            {secondaryActionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
