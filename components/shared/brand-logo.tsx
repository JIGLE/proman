import * as React from "react";

import { cn } from "@/lib/utils/utils";

/**
 * Lares brand logomark — a symmetric Roman semicircular arch with a floating
 * keystone, cut from a solid teal → terracotta tile. The arch is the household
 * threshold the Roman Lares guarded; the keystone and classical proportions give
 * it an official, European read while the Mediterranean terracotta keeps it warm.
 *
 * Hook-free so it renders in both Server and Client Components. Multiple marks
 * on a page reuse the same gradient def id; duplicate ids resolve to the first
 * (identical) definition, which is visually correct.
 */
const GRADIENT_ID = "lares-brand-gradient";

export function LaresMark({
  className,
  title = "Lares",
  ...props
}: React.SVGProps<SVGSVGElement> & { title?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      className={cn("h-6 w-6", className)}
      {...props}
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#d97a53" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill={`url(#${GRADIENT_ID})`} />
      <path
        d="M42 96V60a22 22 0 0 1 44 0v36"
        fill="none"
        stroke="#0b0e14"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <rect x="58" y="30" width="12" height="16" rx="3" fill="#0b0e14" />
    </svg>
  );
}

/** Full lockup: mark + "Lares" wordmark in the display typeface. */
export function LaresLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}): React.ReactElement {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LaresMark className={cn("h-6 w-6 shrink-0", markClassName)} />
      <span className="font-display text-lg font-bold tracking-tight text-[var(--color-foreground)]">
        Lares
      </span>
    </span>
  );
}
