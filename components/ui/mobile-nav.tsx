"use client";

import * as React from "react";
import { LogOut, Building2, Menu, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { LanguageSelector } from "@/components/shared/language-selector";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { useDemoMode } from "@/lib/contexts/demo-context";

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
  const { mobilePrimaryNavigation, isOwnerPortal } = usePortalAccess();
  const { isDemoMode } = useDemoMode();
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
    label: item.label,
    icon: item.icon,
    href: item.href,
  }));

  const isItemActive = (href: string) => {
    if (!href) return false;
    const fullPath = `/${currentLocale}${href}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

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
            style={{ gridTemplateColumns: `repeat(${primaryNavItems.length}, minmax(0, 1fr))` }}
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
                      "text-[10px] font-medium transition-colors",
                      isActive ? "text-accent-primary" : "text-[var(--color-muted-foreground)]",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          {session && (
            <div className="border-t border-[var(--color-border)] px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="w-7 h-7 ring-1 ring-[var(--color-border)]">
                  <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-accent-primary text-white text-[10px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {user?.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <LanguageSelector compact />
                {isOwnerPortal && !isDemoMode && (
                  <Link
                    href={`/${currentLocale}/settings`}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: `/${currentLocale}` })}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {/* iOS safe area padding */}
          <div
            className="bg-[var(--color-background)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          />
        </div>
      </nav>
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
        <Building2 className="h-6 w-6 text-accent-primary" />
        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h1>
      </div>
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover)] transition-colors active:scale-95 touch-manipulation"
        >
          {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}
    </header>
  );
}
