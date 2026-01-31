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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Primary navigation items for bottom bar (max 5 for usability)
const primaryNavItems = [
  { id: "overview", label: "Home", icon: Home },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "tenants", label: "Tenants", icon: Users },
  { id: "financials", label: "Finance", icon: DollarSign },
  { id: "more", label: "More", icon: Menu },
];

// Secondary items in the "More" menu
const secondaryNavItems = [
  { id: "units", label: "Units", icon: Building2 },
  { id: "map", label: "Map View", icon: MapPin },
  { id: "leases", label: "Leases", icon: FileText },
  { id: "owners", label: "Owners", icon: Briefcase },
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "receipts", label: "Receipts", icon: FileText },
  { id: "maintenance", label: "Maintenance", icon: Hammer },
  { id: "correspondence", label: "Mail", icon: Mail },
  { id: "settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileNavProps): React.ReactElement {
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
          "fixed bottom-16 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl transition-transform duration-300 ease-out md:hidden",
          "max-h-[70vh] overflow-y-auto",
          showMoreMenu ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* User profile in more menu */}
        {session && (
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-zinc-700">
                <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-accent-primary text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-50 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-zinc-400 truncate">
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
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sign out button */}
        <div className="p-2 border-t border-zinc-800">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors active:scale-95 touch-manipulation"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Safe area spacer for notched devices */}
        <div className="bg-zinc-950 border-t border-zinc-800">
          <div className="flex items-center justify-around h-16 px-2">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === "more" 
                ? (showMoreMenu || isActiveInSecondary)
                : activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-full px-2 py-1 rounded-lg transition-all duration-200",
                    "active:scale-95 touch-manipulation",
                    isActive
                      ? "text-accent-primary"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive && "bg-accent-primary/20"
                  )}>
                    {item.id === "more" && showMoreMenu ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-accent-primary" : "text-zinc-500"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          {/* iOS safe area padding */}
          <div className="h-safe-area-inset-bottom bg-zinc-950" />
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 md:hidden">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-accent-primary" />
        <h1 className="text-lg font-semibold text-zinc-50">{title}</h1>
      </div>
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors active:scale-95 touch-manipulation"
        >
          {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}
    </header>
  );
}
