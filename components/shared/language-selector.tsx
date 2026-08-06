"use client";

import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
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
      document.cookie = `proman-locale=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }

    const segments = pathname.split("/");
    // Routes outside `[locale]` (e.g. `/auth/signin`) have no locale segment to swap —
    // rewriting segments[1] there would navigate to `/pt/signin`, which does not exist. Their
    // layout reads the cookie set above, so re-rendering is enough to switch language.
    if (!(locales as readonly string[]).includes(segments[1])) {
      router.refresh();
      return;
    }

    segments[1] = newLocale;
    router.push(segments.join("/") || `/${newLocale}`);
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
            "gap-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
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
