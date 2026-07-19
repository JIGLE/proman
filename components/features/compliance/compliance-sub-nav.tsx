"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/utils";

/**
 * Shared sub-navigation for the Compliance hub.
 *
 * The two compliance surfaces — Modelo 179 (AEAT informative return) and Tax Filing —
 * are one job ("stay compliant") that used to occupy two separate top-level System rows
 * (architecture/governance audit 2026-07, Finding 1). They are now grouped under a single
 * "Compliance" sidebar entry; this segmented control links between them so neither page is
 * orphaned. "Modelo 179" is an AEAT proper noun and stays untranslated (cf. locale
 * endonyms); the Tax Filing label is routed through i18n.
 */
export function ComplianceSubNav(): React.ReactElement {
  const pathname = usePathname();
  const tNav = useTranslations("navigation");
  const locale = pathname.split("/")[1] || "pt";

  const items = [
    { href: `/${locale}/compliance/modelo179`, label: "Modelo 179" },
    { href: `/${locale}/compliance/tax-filing`, label: tNav("taxFiling") },
  ];

  return (
    <nav
      aria-label={tNav("compliance")}
      className="mb-6 inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-solid)] p-1"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
              isActive
                ? "bg-accent-primary/15 text-accent-primary"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
