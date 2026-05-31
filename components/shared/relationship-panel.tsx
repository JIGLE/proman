"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { EntityLink, EntityLinkProps } from "./entity-link";

interface RelationshipSection {
  title: string;
  entities: EntityLinkProps[];
  defaultOpen?: boolean;
}

interface RelationshipPanelProps {
  sections: RelationshipSection[];
  className?: string;
}

export function RelationshipPanel({ sections, className }: RelationshipPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultOpen !== false).map((s) => s.title)),
  );

  const toggle = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const nonEmptySections = sections.filter((s) => s.entities.length > 0);

  if (nonEmptySections.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
        Related Entities
      </h3>
      {nonEmptySections.map((section) => {
        const isOpen = openSections.has(section.title);

        return (
          <div key={section.title} className="rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => toggle(section.title)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] transition-colors rounded-t-lg"
            >
              <span className="flex items-center gap-2">
                {section.title}
                <span className="text-xs text-[var(--color-muted-foreground)] font-normal">
                  ({section.entities.length})
                </span>
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              )}
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-2">
                {section.entities.map((entity) => (
                  <EntityLink key={entity.id} {...entity} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
