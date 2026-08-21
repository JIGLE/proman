import type { ReactNode } from "react";

import { cn } from "@/lib/utils/utils";

/**
 * One tile of the control center.
 *
 * The whole layout rests on a single rule: **the page does not scroll, the panels do.** A control
 * centre that pushes half its content below the fold is a list with borders — you still have to
 * scroll to learn whether anything is wrong, which is the one question it exists to answer at a
 * glance.
 *
 * So the header is fixed and the body is the only scrolling part (`min-h-0` is what makes that
 * work inside a grid track — without it a flex child refuses to shrink below its content and the
 * overflow escapes to the page). Above `lg` the panel is bounded by its grid row; below `lg` it
 * has no height constraint at all and the page scrolls normally, because a phone has no viewport
 * to fit a control centre into and pretending otherwise produces six nested scroll areas.
 */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[var(--color-inner-border)] bg-[var(--color-surface-solid)]",
        "lg:min-h-0",
        className,
      )}
    >
      <header className="flex flex-none items-center justify-between gap-2 border-b border-[var(--color-inner-border)] px-4 py-2.5">
        <h2 className="truncate text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          {title}
        </h2>
        {action}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A label/value line. Used wherever a panel states a fact rather than listing records. */
export function Fact({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: ReactNode;
  tone?: "normal" | "muted";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-sm",
          tone === "muted"
            ? "text-[var(--color-muted-foreground)]"
            : "text-[var(--color-foreground)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
