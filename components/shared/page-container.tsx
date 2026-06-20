import { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";
import { PageHeader } from "@/components/shared/page-header";

interface PageContainerProps {
  /** Page title — when provided, a standard PageHeader is rendered. */
  title?: string;
  description?: string;
  summary?: ReactNode;
  /** Header action buttons (right side of the PageHeader). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard page scaffold. Gives every page one consistent vertical rhythm
 * (`space-y-6`) and an optional shared PageHeader, so the app's pages stop
 * hand-rolling their own headers and spacing. Keep page bodies inside this.
 */
export function PageContainer({
  title,
  description,
  summary,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {title && (
        <PageHeader title={title} description={description} summary={summary}>
          {actions}
        </PageHeader>
      )}
      {children}
    </div>
  );
}
