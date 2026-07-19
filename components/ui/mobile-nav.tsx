"use client";

import * as React from "react";
import { LogOut, Building2, Menu, X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "./sheet";
import { LanguageSelector } from "@/components/shared/language-selector";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
  const [moreOpen, setMoreOpen] = React.useState(false);
  const user = session?.user;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Extract locale from pathname
  const currentLocale = pathname.split("/")[1] || "pt";
  const navLabel = (labelKey: string) =>
    tNav(labelKey.replace("navigation.", "") as Parameters<typeof tNav>[0]);

  const primaryNavItems = mobilePrimaryNavigation.map((item) => ({
    id: item.key,
    label: navLabel(item.labelKey),
    icon: item.icon,
    href: item.href,
  }));

  const secondaryNavItems = mobileSecondaryNavigation.map((item) => ({
    id: item.key,
    label: navLabel(item.labelKey),
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

  // Highlight the "More" tab when the active route lives behind it.
  const isMoreActive = secondaryNavItems.some((item) => isItemActive(item.href));
  // Grid holds the primary items plus the "More" trigger (when extras exist).
  const showMore = secondaryNavItems.length > 0;
  const columnCount = primaryNavItems.length + (showMore ? 1 : 0);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Safe area spacer for notched devices */}
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
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 h-full px-1 py-1 rounded-lg transition-all duration-200",
                    "active:scale-95 touch-manipulation",
                    "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-1",
                    isActive
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  )}
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
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isActive ? "text-accent-primary" : "text-[var(--color-muted-foreground)]",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {showMore && (
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full px-1 py-1 rounded-lg transition-all duration-200",
                  "active:scale-95 touch-manipulation",
                  "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-1",
                  isMoreActive
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
                aria-label={tNav("more")}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isMoreActive && "bg-accent-primary/20",
                  )}
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isMoreActive ? "text-accent-primary" : "text-[var(--color-muted-foreground)]",
                  )}
                >
                  {tNav("more")}
                </span>
              </button>
            )}
          </div>
          {/* iOS safe area padding */}
          <div
            className="bg-[var(--color-background)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          />
        </div>
      </nav>

      {/* "More" sheet — surfaces every remaining destination + account actions */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="md:hidden max-h-[85vh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="text-left">
            <SheetTitle>{tNav("more")}</SheetTitle>
          </SheetHeader>

          {session && (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5">
              <Avatar className="w-9 h-9 ring-1 ring-[var(--color-border)]">
                <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-accent-primary text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {user?.email}
                </p>
              </div>
              <NotificationBell />
              <LanguageSelector compact />
              <ThemeToggle variant="button" size="sm" className="h-10 w-10" />
            </div>
          )}

          <nav className="mt-3 grid grid-cols-2 gap-2" aria-label={tNav("more")}>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.href);
              return (
                <SheetClose asChild key={item.id}>
                  <Link
                    href={`/${currentLocale}${item.href}`}
                    onClick={() => onTabChange?.(item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
                      "active:scale-[0.98] touch-manipulation",
                      "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
                      isActive
                        ? "border-accent-primary/40 bg-accent-primary/10 text-accent-primary"
                        : "border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-hover)]",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="truncate text-sm font-medium">{item.label}</span>
                  </Link>
                </SheetClose>
              );
            })}
          </nav>

          {session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: `/${currentLocale}` })}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-error)]/30 px-3 py-3 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 active:scale-[0.98] touch-manipulation"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </button>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Situs mobile top bar — the sticky app chrome shown below `md`, giving the
 * authenticated shell a native-app feel (there is no desktop sidebar on a
 * phone). It carries the Portal mark and the current section title, derived
 * from the active nav item so it stays i18n-correct and in sync with the rail.
 * Purely presentational: no menu toggle — navigation lives in the bottom bar.
 */
export function MobileTopBar(): React.ReactElement {
  const pathname = usePathname();
  const tNav = useTranslations("navigation");
  const { navigation } = usePortalAccess();

  const currentLocale = pathname.split("/")[1] || "pt";
  // Path with the locale prefix stripped, e.g. "/portfolio/123".
  const routePath = `/${pathname.split("/").slice(2).join("/")}`;

  // Resolve the section title from the nav item whose href best matches the
  // current path (longest prefix wins, so "/settings/tax" still reads
  // "Settings"). Falls back to the wordmark when nothing matches.
  const items = navigation.flatMap((group) => group.items);
  const match = items
    .filter((item) => routePath === item.href || routePath.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const title = match
    ? tNav(match.labelKey.replace("navigation.", "") as Parameters<typeof tNav>[0])
    : "Situs";

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden"
      style={{ height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <Link href={`/${currentLocale}/dashboard`} aria-label="Situs — Home" className="shrink-0">
        <SitusPortalMark size="sm" className="h-6 w-6" />
      </Link>
      <h1 className="truncate text-base font-semibold tracking-tight text-[var(--color-foreground)]">
        {title}
      </h1>
    </header>
  );
}
