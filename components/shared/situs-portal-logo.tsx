import * as React from "react";

import { cn } from "@/lib/utils/utils";

/**
 * The Situs Portal — the single production logomark.
 *
 * A Bauhaus-inspired geometric gateway: dotted perimeter (system boundary),
 * semi-circular arc (access and perimeter), foundation line (ledger grounding)
 * and central dot (decision focus). Colours come exclusively from the
 * `--logo-*` CSS variables, so the mark re-themes itself when the country
 * palette changes — authentic flag colours mapped by role, never tinted.
 * Visibility on any surface is guaranteed by the keyline + logo canvas,
 * not by altering the flag colours.
 *
 * Hook-free so it renders in both Server and Client Components.
 */

const SIZE_CLASSES = {
  sm: "h-7 w-7",
  md: "h-16 w-16",
  lg: "h-[132px] w-[132px]",
  hero: "h-[190px] w-[190px]",
} as const;

export type PortalLogoSize = keyof typeof SIZE_CLASSES;

export function SitusPortalMark({
  className,
  size = "sm",
  title = "Situs Portal",
  ...props
}: React.SVGProps<SVGSVGElement> & {
  size?: PortalLogoSize;
  title?: string;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      className={cn(SIZE_CLASSES[size], "shrink-0", className)}
      {...props}
    >
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="var(--logo-primary)"
        stroke="var(--logo-keyline)"
        strokeWidth="1.25"
        strokeDasharray="3 3"
        opacity="0.35"
      />
      <path
        d="M20 50 C20 33.4 33.4 20 50 20 C66.6 20 80 33.4 80 50"
        stroke="var(--logo-keyline)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M20 50 C20 33.4 33.4 20 50 20 C66.6 20 80 33.4 80 50"
        stroke="var(--logo-primary)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M20 72 H80" stroke="var(--logo-keyline)" strokeWidth="11" strokeLinecap="round" />
      <path d="M20 72 H80" stroke="var(--logo-secondary)" strokeWidth="8" strokeLinecap="round" />
      <circle
        cx="50"
        cy="50"
        r="12"
        fill="var(--logo-accent)"
        stroke="var(--logo-keyline)"
        strokeWidth="1.25"
      />
    </svg>
  );
}

/** Full lockup: mark + "SITUS" wordmark (uppercase, wide tracking, per brand spec). */
export function SitusLogo({
  className,
  markClassName,
  size = "sm",
}: {
  className?: string;
  markClassName?: string;
  size?: PortalLogoSize;
}): React.ReactElement {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <SitusPortalMark size={size} className={markClassName} />
      <span className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-foreground)]">
        Situs
      </span>
    </span>
  );
}
