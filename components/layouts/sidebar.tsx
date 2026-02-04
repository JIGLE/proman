"use client";

import * as React from "react";
import { useState, useCallback } from "react";
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
  Search,
  Command,
  Wallet,
  LightbulbIcon,
  FileText,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationCenter, useNotifications, getSampleNotifications } from "@/components/ui/notification-center";

interface SidebarProps {
  activeTab?: string; // Optional now, will use pathname
  onTabChange?: (tab: string) => void; // Optional for backward compatibility
  onOpenCommandPalette?: () => void;
}

export function Sidebar({ activeTab: _activeTab, onTabChange, onOpenCommandPalette }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // Initialize notifications with sample data
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(getSampleNotifications());

  const handleNotificationClick = useCallback((notification: { actionUrl?: string }) => {
    // Navigate based on notification type
    if (notification.actionUrl) {
      // Handle navigation
    }
  }, []);

  const menuItems = [
    { 
      group: "Overview", 
      items: [
        { id: "home", label: "Home", icon: Home, href: "/overview" },
      ]
    },
    { 
      group: "Core", 
      items: [
        { id: "assets", label: "Assets", icon: Building2, href: "/properties" },
        { id: "people", label: "People", icon: Users, href: "/tenants" },
      ]
    },
    { 
      group: "Operations", 
      items: [
        { id: "maintenance", label: "Maintenance", icon: Hammer, href: "/maintenance" },
        { id: "contacts", label: "Contacts", icon: Wrench, href: "/contacts" },
        { id: "contracts", label: "Contracts", icon: FileText, href: "/contracts" },
        { id: "correspondence", label: "Correspondence", icon: Mail, href: "/correspondence" },
      ]
    },
    { 
      group: "Insights", 
      items: [
        { id: "finance", label: "Finance", icon: Wallet, href: "/financials" },
        { id: "insights", label: "Insights", icon: LightbulbIcon, href: "/analytics" },
      ]
    }
  ];

  const _accountItems = [
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const user = session?.user;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  // Get current locale from pathname for settings link
  const currentLocale = pathname.split('/')[1] || 'en';

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r border-[var(--color-sidebar-border)] bg-gradient-to-b from-[var(--color-sidebar-bg)] to-[var(--color-sidebar-bg)]/95 transition-all duration-300 overflow-x-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with Logo and Quick Actions */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-sidebar-border)] px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-6 w-6 text-[var(--color-foreground)] shrink-0" />
          {!collapsed && (
            <span className="text-lg font-semibold text-[var(--color-foreground)] truncate">Proman</span>
          )}
        </div>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-1")}>
          <Link
            href={`/${currentLocale}/settings`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <ThemeToggle variant="button" size="sm" className="h-8 w-8" />
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDelete={deleteNotification}
            onClearAll={clearAll}
            onNotificationClick={handleNotificationClick}
          />
        </div>
      </div>

      {/* Search / Command Palette Trigger */}
      {!collapsed && onOpenCommandPalette && (
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border-[var(--color-border)] bg-[var(--color-input)]"
            onClick={onOpenCommandPalette}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 font-mono text-[10px] font-medium text-[var(--color-muted-foreground)]">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
        </div>
      )}
      {collapsed && onOpenCommandPalette && (
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-9"
            onClick={onOpenCommandPalette}
            title="Search (⌘K)"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav
        id="main-navigation"
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto scrollbar-thin space-y-1 px-2 py-3"
      >
        {menuItems.map((group, groupIndex) => (
          <div
            key={group.group}
            role="group"
            aria-labelledby={`nav-group-${groupIndex}`}
            className={cn("space-y-1", groupIndex > 0 && "mt-4")}
          >
            {!collapsed && (
              <div className="px-3 py-2">
                <h3
                  id={`nav-group-${groupIndex}`}
                  className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest"
                >
                  {group.group}
                </h3>
              </div>
            )}
            
            <div className="space-y-0.5" role="list">
              {group.items.map((item) => {
                const Icon = item.icon;
                // Extract locale from pathname (e.g., /en/properties -> en)
                const currentLocale = pathname.split('/')[1];
                // Check if current route matches this menu item
                const isActive = pathname.includes(item.href);
                
                return (
                  <Link
                    key={item.id}
                    href={`/${currentLocale}${item.href}`}
                    role="listitem"
                    onClick={() => onTabChange?.(item.id)} // Support legacy callback if provided
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out group",
                      "hover:bg-gradient-to-r hover:from-[var(--color-surface-hover)] hover:to-transparent",
                      "hover:translate-x-0.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-sidebar-bg)]",
                      collapsed && "justify-center px-2 rounded-lg",
                      isActive 
                        ? "text-[var(--color-accent)] drop-shadow-[0_0_8px_var(--color-accent)]"
                        : "text-[var(--color-sidebar-text)] hover:text-[var(--color-foreground)]"
                    )}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-all duration-300",
                      isActive 
                        ? "text-[var(--color-accent)] drop-shadow-[0_0_4px_var(--color-accent)]" 
                        : "text-[var(--color-sidebar-text)] group-hover:text-[var(--color-foreground)] group-hover:scale-110"
                    )} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
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

      {/* Sticky Footer with User Profile */}
      <div className="flex-none border-t border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)]">
        {session && (
          <div className="p-3">
            {!collapsed ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                <Avatar className="w-8 h-8 ring-2 ring-[var(--color-border)]">
                  <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                  <AvatarFallback className="bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-xs font-semibold">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="h-8 w-8 p-0 hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="w-full h-9 p-0 hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="flex-none p-2 border-t border-[var(--color-sidebar-border)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          )}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
