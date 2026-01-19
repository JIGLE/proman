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
    { id: "overview", label: "Overview", icon: Home },
    { id: "properties", label: "Properties", icon: Building2 },
    { id: "owners", label: "Owners", icon: Briefcase },
    { id: "tenants", label: "Tenants", icon: Users },
    { id: "maintenance", label: "Maintenance", icon: Hammer },
    { id: "financials", label: "Financials", icon: DollarSign },
    { id: "receipts", label: "Receipts", icon: FileText },
    { id: "correspondence", label: "Correspondence", icon: Mail },
  ];

  const accountItems = [
    { id: "profile", label: "Profile", icon: User },
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
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        <Separator className="my-2" />

        {/* Account Items */}
        {accountItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <Separator className="my-2" />

      {/* User Profile Section */}
      {session && (
        <div className="p-2">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-zinc-900">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-50 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <div className="mt-2">
            <button
              onClick={() => signOut()}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50",
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

      {/* Collapse Button */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-start text-zinc-400 hover:text-zinc-50"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
