"use client";

import { useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";

interface ContextualDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function ContextualDrawer({
  isOpen,
  onClose,
  title,
  href,
  children,
  className,
}: ContextualDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-[640px] bg-[var(--color-background)] shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] truncate">{title}</h2>
          <div className="flex items-center gap-2">
            {href && (
              <Link href={href}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Full Page
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-65px)] p-6">{children}</div>
      </div>
    </>
  );
}
