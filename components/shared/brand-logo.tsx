import * as React from "react";

import { cn } from "@/lib/utils/utils";

/**
 * Domora brand logomark — an arched doorway ("domus"/threshold) that also
 * reads as a "D", filled with the teal → terracotta brand gradient.
 *
 * Hook-free so it renders in both Server and Client Components. Multiple marks
 * on a page reuse the same gradient def id; duplicate ids resolve to the first
 * (identical) definition, which is visually correct.
 */
const GRADIENT_ID = "domora-brand-gradient";

export function DomoraMark({
  className,
  title = "Domora",
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
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#e8825a" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="#0b0e14" />
      <path
        d="M40 100V58a24 24 0 0 1 48 0v42"
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M33 100h62"
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="64" cy="61" r="7" fill={`url(#${GRADIENT_ID})`} />
    </svg>
  );
}

/** Full lockup: mark + "Domora" wordmark in the display typeface. */
export function DomoraLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}): React.ReactElement {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <DomoraMark className={cn("h-6 w-6 shrink-0", markClassName)} />
      <span className="font-display text-lg font-bold tracking-tight text-[var(--color-foreground)]">
        Domora
      </span>
    </span>
  );
}
