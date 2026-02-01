"use client";

import * as React from "react";
import { useState } from "react";
import {
  Building2,
  Users,
  DollarSign,
  Home,
  Menu,
  X,
  FileText,
  Mail,
  Hammer,
  MapPin,
  Briefcase,
  Settings,
  LogOut,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearchClick?: () => void;
}

// Primary navigation items for bottom bar (4 items for optimal thumb reach)
const primaryNavItems = [
  { id: "overview", label: "Home", icon: Home },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "tenants", label: "Tenants", icon: Users },
  { id: "more", label: "More", icon: Menu },
];

// Secondary items in the "More" menu
const secondaryNavItems = [
  { id: "owners", label: "Owners", icon: Briefcase },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "maintenance", label: "Maintenance", icon: Hammer },
  { id: "correspondence", label: "Correspondence", icon: Mail },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];
  { id: "settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav({ activeTab, onTabChange, onSearchClick }: MobileNavProps): React.ReactElement {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const handleNavClick = (id: string) => {
    if (id === "more") {
      setShowMoreMenu(!showMoreMenu);
    } else {
      onTabChange(id);
      setShowMoreMenu(false);
    }
  };

  const isActiveInSecondary = secondaryNavItems.some(item => item.id === activeTab);

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* More Menu Slide-up Panel */}
      <div
        className={cn(
          "fixed bottom-16 left-0 right-0 z-50 bg-[var(--color-card)] border-t border-[var(--color-border)] rounded-t-2xl transition-transform duration-300 ease-out md:hidden",
          "max-h-[70vh] overflow-y-auto",
          showMoreMenu ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
        </div>

        {/* User profile in more menu */}
        {session && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-[var(--color-border)]">
                <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-accent-primary text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Secondary nav items */}
        <div className="p-2 grid grid-cols-3 gap-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-200",
                  "active:scale-95 touch-manipulation",
                  isActive
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sign out button */}
        <div className="p-2 border-t border-[var(--color-border)]">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 p-3 rounded-xl text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors active:scale-95 touch-manipulation"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Safe area spacer for notched devices */}
        <div className="bg-[var(--color-background)]/95 backdrop-blur-sm border-t border-[var(--color-border)]">
          <div className="relative flex items-center justify-around h-16 px-2">
            {primaryNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.id === "more" 
                ? (showMoreMenu || isActiveInSecondary)
                : activeTab === item.id;
              
              // Create gap for FAB button after second item (between Properties and People)
              const marginClass = index === 2 ? "ml-16" : "";
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-full px-2 py-1 rounded-lg transition-all duration-200",
                    "active:scale-95 touch-manipulation",
                    "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-1",
                    marginClass,
                    isActive
                      ? "text-accent-primary"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  )}
                  aria-label={item.label}
                  aria-current={isActive && item.id !== "more" ? "page" : undefined}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive && "bg-accent-primary/20"
                  )}>
                    {item.id === "more" && showMoreMenu ? (
                      <X className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-accent-primary" : "text-[var(--color-muted-foreground)]"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* Floating Action Button (FAB) for Search - centered between Properties and People */}
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 -top-6",
                  "w-14 h-14 rounded-full",
                  "bg-gradient-to-br from-accent-primary to-accent-primary/80",
                  "text-white shadow-lg shadow-accent-primary/50",
                  "flex items-center justify-center",
                  "transition-all duration-200 active:scale-90",
                  "ring-4 ring-[var(--color-background)]",
                  "focus-visible:ring-4 focus-visible:ring-accent-primary/50 focus-visible:outline-none",
                  "hover:shadow-xl hover:shadow-accent-primary/60"
                )}
                aria-label="Open search"
                title="Search (⌘K)"
              >
                <Search className="h-6 w-6" aria-hidden="true" />
              </button>
            )}
          </div>
          {/* iOS safe area padding */}
          <div 
            className="bg-[var(--color-background)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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

export function MobileHeader({ title, onMenuClick, showMenu }: MobileHeaderProps): React.ReactElement {
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
