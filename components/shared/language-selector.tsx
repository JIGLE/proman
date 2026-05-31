"use client";

import { usePathname, useRouter } from "next/navigation";
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
};

const localeCodes: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
};

interface LanguageSelectorProps {
  /** Compact mode shows only the flag/icon */
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className }: LanguageSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from the pathname (e.g. /pt/overview → pt)
  const segments = pathname.split("/");
  const currentLocale = (locales as readonly string[]).includes(segments[1])
    ? (segments[1] as Locale)
    : "pt";

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    // Persist preference in a cookie so root redirects and demo mode respect it
    if (typeof document !== "undefined") {
      document.cookie = `proman-locale=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    // Replace the locale segment in the URL
    const newSegments = [...segments];
    newSegments[1] = newLocale;
    router.push(newSegments.join("/") || `/${newLocale}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
            compact ? "h-9 w-9 p-0" : "h-9 px-2.5",
            className,
          )}
          title="Language"
          aria-label="Change language"
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
