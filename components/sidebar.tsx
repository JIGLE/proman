"use client";

import * as React from "react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Building2,
  Users,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Home,
  User,
  Settings,
  LogOut,
  Mail,
  Briefcase,
  Hammer,
  MapPin,
  BarChart3,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  const menuItems = [
    { 
      group: "Overview", 
      items: [
        { id: "overview", label: "Dashboard", icon: Home },
      ]
    },
    { 
      group: "Property Management", 
      items: [
        { id: "properties", label: "Properties", icon: Building2 },
        { id: "units", label: "Units", icon: Building2 },
        { id: "map", label: "Map View", icon: MapPin },
      ]
    },
    { 
      group: "People & Leases", 
      items: [
        { id: "leases", label: "Leases", icon: FileText },
        { id: "owners", label: "Owners", icon: Briefcase },
        { id: "tenants", label: "Tenants", icon: Users },
      ]
    },
    { 
      group: "Financial Management", 
      items: [
        { id: "payments", label: "Payment Matrix", icon: DollarSign },
        { id: "financials", label: "Financials", icon: DollarSign },
        { id: "receipts", label: "Receipts", icon: FileText },
      ]
    },
    { 
      group: "Operations", 
      items: [
        { id: "maintenance", label: "Maintenance", icon: Hammer },
        { id: "correspondence", label: "Correspondence", icon: Mail },
      ]
    },
    { 
      group: "Insights", 
      items: [
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "reports", label: "Reports", icon: PieChart },
      ]
    }
  ];

  const accountItems = [
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const user = session?.user;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-zinc-50" />
            <span className="text-lg font-semibold text-zinc-50">Proman</span>
          </div>
        )}
        {collapsed && <Building2 className="h-6 w-6 text-zinc-50 mx-auto" />}
      </div>

      {/* Navigation */}
      <nav
        id="main-navigation"
        aria-label="Main navigation"
        className="flex-1 space-y-1 p-2"
      >
        {menuItems.map((group, groupIndex) => (
          <div
            key={group.group}
            role="group"
            aria-labelledby={`nav-group-${groupIndex}`}
            className={cn("space-y-1", groupIndex > 0 && "mt-6")}
          >
            {!collapsed && (
              <div className="px-3 py-2">
                <h3
                  id={`nav-group-${groupIndex}`}
                  className="text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                >
                  {group.group}
                </h3>
              </div>
            )}
            
            <div className="space-y-1" role="list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    role="listitem"
                    onClick={() => onTabChange(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                      "hover:bg-[var(--color-surface-hover)] hover:text-zinc-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-1",
                      collapsed && "justify-center px-2",
                      isActive 
                        ? "bg-accent-primary/20 text-accent-primary border-r-2 border-accent-primary" 
                        : "text-zinc-400"
                    )}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-accent-primary" : "text-zinc-400 group-hover:text-zinc-50"
                    )} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {!collapsed && groupIndex < menuItems.length - 1 && (
              <Separator className="mt-4 mx-3" />
            )}
          </div>
        ))}

        {/* Account Settings */}
        <Separator className="my-4" />
        
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Account
              </h3>
            </div>
          )}
          
          {accountItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  "hover:bg-[var(--color-surface-hover)] hover:text-zinc-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
                  collapsed && "justify-center px-2",
                  isActive 
                    ? "bg-accent-primary/20 text-accent-primary border-r-2 border-accent-primary" 
                    : "text-zinc-400"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-accent-primary" : "text-zinc-400 group-hover:text-zinc-50"
                )} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <Separator className="my-2" />

      {/* User Profile Section */}
      {session && (
        <div className="p-3">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
              <Avatar className="w-9 h-9 ring-2 ring-[var(--color-border)]">
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
          )}

          {/* Account Actions */}
          <div className="mt-3 space-y-1">
            {accountItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    "text-zinc-400 hover:bg-[var(--color-surface-hover)] hover:text-zinc-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
            
            <button
              onClick={() => signOut()}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                "text-zinc-400 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
                collapsed && "justify-center"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      )}

      <Separator className="my-2" />

      {/* Collapse Toggle */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-start text-zinc-400 hover:text-zinc-50 hover:bg-[var(--color-surface-hover)] transition-all duration-200",
            "border border-[var(--color-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
