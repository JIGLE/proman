"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  LogOut,
  Mail,
  Hammer,
  Wallet,
  LightbulbIcon,
  FileText,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/shared/language-selector";
import {
  NotificationCenter,
  useNotifications,
  getSampleNotifications,
} from "@/components/ui/notification-center";

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const SIDEBAR_COLLAPSE_KEY = "proman.sidebar.collapsed";

export function Sidebar({ onTabChange }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

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

  const insightsEnabled = process.env.NEXT_PUBLIC_ENABLE_INSIGHTS !== "false";

  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications(getSampleNotifications());

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

  const menuItems = [
    {
      group: "Main",
      items: [
        { id: "home", label: "Home", icon: Home, href: "/overview" },
        { id: "assets", label: "Properties", icon: Building2, href: "/properties" },
        { id: "people", label: "Tenants", icon: Users, href: "/tenants" },
        { id: "contracts", label: "Contracts", icon: FileText, href: "/contracts" },
      ],
    },
    {
      group: "Operations",
      items: [
        { id: "maintenance", label: "Maintenance", icon: Hammer, href: "/maintenance" },
        { id: "contacts", label: "Contacts", icon: UserCircle, href: "/contacts" },
        { id: "correspondence", label: "Messages", icon: Mail, href: "/correspondence" },
      ],
    },
    {
      group: "Analytics",
      items: [
        { id: "finance", label: "Finance", icon: Wallet, href: "/financials" },
        ...(insightsEnabled
          ? [{ id: "insights", label: "Insights", icon: LightbulbIcon, href: "/insights" }]
          : []),
      ],
    },
  ];

  const user = session?.user;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";
  const currentLocale = pathname.split("/")[1] || "pt";

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r border-[var(--color-sidebar-border)] bg-gradient-to-b from-[var(--color-sidebar-bg)] to-[var(--color-sidebar-bg)]/95 transition-all duration-300 min-w-0 overflow-x-hidden",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-[var(--color-sidebar-border)] px-3">
        {collapsed ? (
          // Collapsed: centered logo that expands on click
            <button
            onClick={handleToggleCollapsed}
            className="w-full flex items-center justify-center h-full"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
          >
            <Building2 className="h-6 w-6 text-blue-500" />
          </button>
        ) : (
          // Expanded: logo + collapse button
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-6 w-6 text-blue-500 shrink-0" />
              <span className="text-lg font-semibold text-[var(--color-foreground)] truncate">
                Proman
              </span>
            </div>
                {/* Notifications (only shown when expanded) */}
                <div className="mr-2">
                  <NotificationCenter
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onDelete={deleteNotification}
                    onClearAll={clearAll}
                    onNotificationClick={() => {}}
                  />
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
          <div
            key={group.group}
            role="group"
            className={cn("space-y-1", groupIndex > 0 && "mt-4")}
          >
            {!collapsed && (
              <div className="px-3 py-2">
                <h3 className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
                  {group.group}
                </h3>
              </div>
            )}

            <div className="space-y-0.5" role="list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.includes(item.href);

                return (
                  <Link
                    key={item.id}
                    href={`/${currentLocale}${item.href}`}
                    role="listitem"
                    onClick={() => onTabChange?.(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-2",
                        isActive
                          ? "bg-blue-600/10 text-blue-600"
                          : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
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
        <div className="flex-none border-t border-[var(--color-sidebar-border)] p-2">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
                <Avatar className="w-8 h-8 ring-2 ring-[var(--color-border)]">
                  <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 px-1">
                <LanguageSelector compact />
                <ThemeToggle variant="button" size="sm" className="h-8 w-8" />
                <Link href={`/${currentLocale}/settings`} title="Settings">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Settings className="h-4 w-4" />
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: `/${currentLocale}` })}
                  className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-[var(--color-border)]">
                <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCollapsed}
                className="h-8 w-8 p-0 text-[var(--color-muted-foreground)]"
                title="Expand Sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
