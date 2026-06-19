"use client";

import * as React from "react";
import { LogOut, Building2, Menu, X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./sheet";
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
                    isMoreActive
                      ? "text-accent-primary"
                      : "text-[var(--color-muted-foreground)]",
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
              <ThemeToggle variant="button" size="sm" />
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
