import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /**
   * Optional at-a-glance summary line rendered under the title — e.g.
   * "12 units · 96% occupied · €4,200/mo". Use for scannable context that
   * doesn't warrant a full description sentence.
   */
  summary?: ReactNode;
  children?: ReactNode; // action buttons slot
}

export function PageHeader({ title, description, summary, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
        )}
        {summary && (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{summary}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
