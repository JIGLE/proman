"use client";

import * as React from "react";
import { LogOut, Building2, Menu, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./sheet";
import { LanguageSelector } from "@/components/shared/language-selector";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePortalAccess } from "@/lib/contexts/portal-context";

interface MobileNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

/** Endonyms — the same in every catalog, so not routed through i18n. */
const LOCALE_LABELS: Record<string, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
  it: "Italiano",
};

export function MobileBottomNav({
  activeTab: _activeTab,
  onTabChange,
}: MobileNavProps): React.ReactElement {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { mobilePrimaryNavigation, mobileSecondaryNavigation } = usePortalAccess();
  const tNav = useTranslations("navigation");
  const user = session?.user;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Extract locale from pathname
  const currentLocale = pathname.split("/")[1] || "pt";
  const primaryNavItems = mobilePrimaryNavigation.map((item) => ({
    id: item.key,
    label: tNav(item.labelKey.replace("navigation.", "") as Parameters<typeof tNav>[0]),
    icon: item.icon,
    href: item.href,
  }));
  // Everything not on the bottom bar (Maintenance, Leases, Analytics, Reports,
  // Documents, Messages, Compliance, Settings…) has no other home on a phone — the
  // desktop sidebar is hidden below `md`. Surface it inside the "More" sheet so the
  // whole app stays reachable from mobile chrome, not just the 4 primary tabs.
  const secondaryNavItems = mobileSecondaryNavigation.map((item) => ({
    id: item.key,
    label: tNav(item.labelKey.replace("navigation.", "") as Parameters<typeof tNav>[0]),
    icon: item.icon,
    href: item.href,
  }));

  const isItemActive = (href: string) => {
    if (!href) return false;
    const fullPath = `/${currentLocale}${href}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  const tabItemClass = (isActive: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-0.5 h-full px-1 py-1 rounded-lg transition-all duration-200",
      "active:scale-95 touch-manipulation",
      "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-1",
      isActive
        ? "bg-accent-primary/15 text-accent-primary"
        : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
    );

  // A single bottom bar: the primary tabs plus one "Account" tab that opens a
  // bottom sheet with profile utilities (language, settings, sign-out) — so the
  // most valuable strip on the phone isn't split across two rows.
  const columnCount = primaryNavItems.length + (session ? 1 : 0);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="bg-[var(--color-background)]/95 backdrop-blur-sm border-t border-[var(--color-border)]">
        <div
          className="grid h-16 items-center px-2"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.id}
                href={`/${currentLocale}${item.href}`}
                onClick={() => onTabChange?.(item.id)}
                className={tabItemClass(isActive)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive && "bg-accent-primary/20",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}

          {session && (
            <Sheet>
              <SheetTrigger className={tabItemClass(false)} aria-label={tNav("more")}>
                <div className="p-0.5">
                  <Avatar className="h-7 w-7 ring-1 ring-[var(--color-border)]">
                    <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-accent-primary text-white text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs font-medium">{tNav("more")}</span>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5"
              >
                <SheetTitle className="sr-only">{tNav("more")}</SheetTitle>
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-11 w-11 ring-1 ring-[var(--color-border)]">
                    <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-accent-primary text-white text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                      {user?.name}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Navigate — the rest of the app that isn't on the bottom bar. */}
                {secondaryNavItems.length > 0 && (
                  <div className="mb-2 grid grid-cols-2 gap-1.5">
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item.href);
                      return (
                        <SheetClose asChild key={item.id}>
                          <Link
                            href={`/${currentLocale}${item.href}`}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                              isActive
                                ? "bg-accent-primary/15 text-accent-primary"
                                : "text-[var(--color-foreground)] hover:bg-[var(--color-hover)]",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                !isActive && "text-[var(--color-muted-foreground)]",
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between py-3">
                    <span className="flex items-center gap-3 text-sm text-[var(--color-foreground)]">
                      <Globe className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      {LOCALE_LABELS[currentLocale] ?? currentLocale.toUpperCase()}
                    </span>
                    <LanguageSelector compact />
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: `/${currentLocale}` })}
                    className="flex items-center gap-3 py-3 text-sm text-[var(--color-error)]"
                  >
                    <LogOut className="h-4 w-4" />
                    {tNav("signOut")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        <div
          className="bg-[var(--color-background)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        />
      </div>
    </nav>
  );
}

/**
 * Mobile header component with menu toggle
 */
interface MobileHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function MobileHeader({
  title,
  onMenuClick,
  showMenu,
}: MobileHeaderProps): React.ReactElement {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[var(--color-background)]/95 backdrop-blur border-b border-[var(--color-border)] md:hidden">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-accent-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h1>
      </div>
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover)] transition-colors active:scale-95 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          aria-label={showMenu ? "Close menu" : "Open menu"}
        >
          {showMenu ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      )}
    </header>
  );
}
