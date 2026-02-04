"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
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

const SIDEBAR_COLLAPSE_KEY = "proman.sidebar.collapsed";

export function Sidebar({ activeTab: _activeTab, onTabChange, onOpenCommandPalette }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      if (storedValue !== null) {
        setCollapsed(storedValue === "true");
      }
    } catch {
      // Ignore storage access issues to avoid blocking render
    }
  }, []);

  // Feature flag to allow safe rollout of the new Insights page
  const insightsEnabled = process.env.NEXT_PUBLIC_ENABLE_INSIGHTS !== "false";
  
  // Initialize notifications with sample data
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(getSampleNotifications());

  const handleNotificationClick = useCallback((notification: { id: string; type: string; actionUrl?: string; metadata?: Record<string, unknown> }) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Navigate based on notification type and actionUrl
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    } else {
      // Fallback navigation based on type
      const locale = pathname?.split('/')[1] || 'en';
      switch (notification.type) {
        case 'payment_overdue':
        case 'payment_received':
          router.push(`/${locale}/financials?view=receipts`);
          break;
        case 'maintenance_request':
        case 'maintenance_completed':
          router.push(`/${locale}/maintenance`);
          break;
        case 'lease_expiring':
        case 'lease_signed':
          router.push(`/${locale}/contracts`);
          break;
        case 'new_message':
          router.push(`/${locale}/correspondence`);
          break;
        case 'document_uploaded':
          router.push(`/${locale}/documents`);
          break;
        case 'system_update':
        case 'system_alert':
          router.push(`/${locale}/settings`);
          break;
        default:
          router.push(`/${locale}/overview`);
      }
    }
  }, [markAsRead, router, pathname]);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
      } catch {
        // Ignore storage access issues to avoid blocking render
      }
      return next;
    });
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
        ...(insightsEnabled ? [{ id: "insights", label: "Insights", icon: LightbulbIcon, href: "/insights" }] : []),
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
        "relative flex h-screen flex-col border-r border-[var(--color-sidebar-border)] bg-gradient-to-b from-[var(--color-sidebar-bg)] to-[var(--color-sidebar-bg)]/95 transition-all duration-300 min-w-0 overflow-x-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with Logo and Notifications */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-sidebar-border)] px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-6 w-6 text-[var(--color-foreground)] shrink-0" />
          {!collapsed && (
            <span className="text-lg font-semibold text-[var(--color-foreground)] truncate">Proman</span>
          )}
        </div>

        {/* Right side: notifications (hidden when collapsed) and collapse toggle */}
        <div className="flex items-center gap-2">
          {!collapsed && (
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
              onClearAll={clearAll}
              onNotificationClick={handleNotificationClick}
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapsed}
            className={cn(
              "h-9 w-9 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]",
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
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin space-y-1 px-2 py-3 pr-2"
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
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                  >
                    <div
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

      {/* User Profile (moved to bottom for better collapsed UX) and Collapse Toggle */}
      {session && (
        <div className="flex-none border-t border-[var(--color-sidebar-border)] p-2">
          {!collapsed ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                <Avatar className="w-8 h-8 ring-2 ring-[var(--color-border)]">
                  <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                  <AvatarFallback className="bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{user?.name}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-3">
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user?.email}</p>
                <div className="flex items-center gap-1">
                  <Link href={`/${currentLocale}/settings`} title="Settings">
                    <div className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors" aria-hidden>
                      <Settings className="h-4 w-4" />
                    </div>
                  </Link>
                  <ThemeToggle variant="button" size="sm" className="h-9 w-9" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="h-9 w-9 p-0 hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-[var(--color-border)]">
                <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}


        </div>
      )}

    </div>
  );
}
