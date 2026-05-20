"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useDemoMode } from "@/lib/contexts/demo-context";
import { usePortalAccess } from "@/lib/contexts/portal-context";

// ── Nav Item Type ──────────────────────────────────────
interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const SIDEBAR_COLLAPSE_KEY = "proman.sidebar.collapsed";

// ── Sidebar Footer ─────────────────────────────────────
interface SidebarFooterProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  locale: string;
  user?: { name?: string | null; email?: string | null; image?: string | null };
  subtitle?: string | null;
}

function SidebarFooter({
  collapsed,
  onToggleCollapsed,
  locale,
  user,
  subtitle,
}: SidebarFooterProps): React.ReactElement {
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  if (!collapsed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="w-8 h-8 ring-2 ring-[var(--color-inner-border)]">
            <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
            <AvatarFallback className="bg-[var(--color-primary)] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
              {user?.name || "Portal User"}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)] truncate">
              {subtitle || user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 px-1">
          <LanguageSelector compact />
          <ThemeToggle variant="button" size="sm" className="h-8 w-8" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className="w-8 h-8 ring-2 ring-[var(--color-inner-border)]">
        <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
        <AvatarFallback className="bg-[var(--color-primary)] text-white text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapsed}
        className="h-8 w-8 p-0 text-[var(--color-muted-foreground)]"
        title="Expand Sidebar"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function Sidebar({ onTabChange }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const { isDemoMode, demoPerspective } = useDemoMode();
  const { navigation } = usePortalAccess();
  const t = useTranslations("navigation");

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      if (storedValue !== null) {
        setCollapsed(storedValue === "true");
      }
    } catch {
      // Ignore storage access issues
    }
  }, []);

  // Build menu from config
  const menuItems = navigation;

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
      } catch {
        // Ignore storage access issues
      }
      return next;
    });
  }, []);

  const user = session?.user;
  const currentLocale = pathname.split("/")[1] || "pt";

  return (
    <div
      data-tour="sidebar"
      className={cn(
        "glass-sidebar relative flex h-screen flex-col transition-all duration-300 min-w-0 overflow-x-hidden",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-[var(--color-inner-border)] px-3">
        {collapsed ? (
          // Collapsed: centered logo that expands on click
          <button
            onClick={handleToggleCollapsed}
            className="w-full flex items-center justify-center h-full"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <Building2 className="h-6 w-6 text-[var(--color-primary)]" />
          </button>
        ) : (
          // Expanded: logo + collapse button
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-6 w-6 text-[var(--color-primary)] shrink-0" />
              <span className="text-lg font-semibold text-[var(--color-foreground)] truncate">
                Proman
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCollapsed}
              className="h-8 w-8 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav
        id="main-navigation"
        aria-label="Main navigation"
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {menuItems.map((group, groupIndex) => (
          <div key={group.group} role="group" className={cn("space-y-1", groupIndex > 0 && "mt-4")}>
            {!collapsed && (
              <div className="px-3 py-2">
                <h3 className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
                  {t(group.groupLabelKey.replace("navigation.", "") as Parameters<typeof t>[0])}
                </h3>
              </div>
            )}

            <div className="space-y-0.5" role="list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === `/${currentLocale}${item.href}` ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`/${currentLocale}${item.href}/`));

                const translatedLabel = t(
                  item.labelKey.replace("navigation.", "") as Parameters<typeof t>[0],
                );
                return (
                  <Link
                    key={item.key}
                    href={`/${currentLocale}${item.href}`}
                    role="listitem"
                    onClick={() => onTabChange?.(item.key)}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? translatedLabel : undefined}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-2",
                        isActive
                          ? "bg-[var(--color-sidebar-active)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40"
                          : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive && "text-[var(--color-primary)]",
                        )}
                      />
                      {!collapsed && <span className="truncate">{translatedLabel}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>

            {!collapsed && groupIndex < menuItems.length - 1 && (
              <Separator className="mt-3 mx-3 opacity-50" />
            )}
          </div>
        ))}
      </nav>

      {/* User Profile */}
      {session && (
        <div className="flex-none border-t border-[var(--color-inner-border)] p-2">
          <SidebarFooter
            collapsed={collapsed}
            onToggleCollapsed={handleToggleCollapsed}
            locale={currentLocale}
            user={user}
            subtitle={isDemoMode ? `Demo ${demoPerspective}` : user?.email}
          />
        </div>
      )}
    </div>
  );
}
