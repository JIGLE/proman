"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/utils";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const localeFlags: Record<Locale, string> = {
  pt: "🇵🇹",
  en: "🇬🇧",
  es: "🇪🇸",
  it: "🇮🇹",
};

const localeCodes: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
  it: "IT",
};

interface LanguageSelectorProps {
  /** Compact mode shows only the flag/icon */
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className }: LanguageSelectorProps) {
  const router = useRouter();
  const t = useTranslations("language");

  // Read the active locale from the provider rather than the URL: the auth pages sit outside
  // the `[locale]` segment and resolve their locale from the cookie, so there is nothing in
  // the path to parse there.
  const currentLocale = useLocale() as Locale;

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    // Persist preference in a cookie so root redirects and demo mode respect it
    if (typeof document !== "undefined") {
      document.cookie = `situs-locale=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }

    // No URL carries a locale segment any more, so there is nothing to rewrite: the proxy
    // rewrites by cookie and every layout resolves its locale from it, which makes re-rendering
    // the entire switch. The old branch that swapped segments[1] is unreachable, not merely
    // unused — leaving it would describe a URL shape the app no longer serves.
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          // `icon` carries both the min-h and min-w touch-target floors; `sm` + a manual
          // `h-9 w-9` only ever picked up the height one, leaving this trigger 36px wide.
          size={compact ? "icon" : "sm"}
          className={cn(
            "gap-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/5",
            compact ? "" : "h-9 px-2.5",
            className,
          )}
          title={t("label")}
          aria-label={t("change")}
        >
          {compact ? (
            <Globe className="h-4 w-4" />
          ) : (
            <>
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs font-medium tracking-wide">
                {localeCodes[currentLocale]}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className={cn(
              "gap-2 cursor-pointer",
              locale === currentLocale && "bg-accent font-medium",
            )}
          >
            <span className="text-base leading-none">{localeFlags[locale]}</span>
            <span className="text-sm">{localeNames[locale]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
