"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  Building2,
  Users,
  FileText,
  DollarSign,
  Mail,
  Hammer,
  BarChart3,
  PieChart,
  Settings,
  User,
  MapPin,
  Briefcase,
  Plus,
  ArrowRight,
  Command,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "navigation" | "action" | "search";
  keywords?: string[];
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onAction?: (actionId: string) => void;
  searchResults?: {
    properties?: Array<{ id: string; name: string; address?: string }>;
    tenants?: Array<{ id: string; name: string; email?: string }>;
    leases?: Array<{ id: string; tenantName: string; propertyName: string }>;
  };
  onSearch?: (query: string) => void;
}

// Navigation items with icons and descriptions
const navigationItems: Omit<CommandItem, "onSelect">[] = [
  { id: "overview", label: "Dashboard", description: "Go to overview dashboard", icon: Home, category: "navigation", keywords: ["home", "main", "start"] },
  { id: "properties", label: "Properties", description: "Manage your properties", icon: Building2, category: "navigation", keywords: ["buildings", "real estate"] },
  { id: "units", label: "Units", description: "View and manage units", icon: Building2, category: "navigation", keywords: ["apartments", "rooms"] },
  { id: "map", label: "Map View", description: "See properties on map", icon: MapPin, category: "navigation", keywords: ["location", "geography"] },
  { id: "leases", label: "Leases", description: "Manage lease agreements", icon: FileText, category: "navigation", keywords: ["contracts", "agreements"] },
  { id: "owners", label: "Owners", description: "Property owners", icon: Briefcase, category: "navigation", keywords: ["landlords"] },
  { id: "tenants", label: "Tenants", description: "Manage tenants", icon: Users, category: "navigation", keywords: ["renters", "residents"] },
  { id: "payments", label: "Payment Matrix", description: "Track payment status", icon: DollarSign, category: "navigation", keywords: ["rent", "money", "billing"] },
  { id: "financials", label: "Financials", description: "Financial overview", icon: DollarSign, category: "navigation", keywords: ["money", "accounting", "income"] },
  { id: "receipts", label: "Receipts", description: "View receipts", icon: FileText, category: "navigation", keywords: ["invoices", "bills"] },
  { id: "maintenance", label: "Maintenance", description: "Maintenance requests", icon: Hammer, category: "navigation", keywords: ["repairs", "fixes", "issues"] },
  { id: "correspondence", label: "Correspondence", description: "Letters and communications", icon: Mail, category: "navigation", keywords: ["emails", "letters", "messages"] },
  { id: "analytics", label: "Analytics", description: "View analytics dashboard", icon: BarChart3, category: "navigation", keywords: ["charts", "statistics", "data"] },
  { id: "reports", label: "Reports", description: "Generate reports", icon: PieChart, category: "navigation", keywords: ["documents", "summaries"] },
  { id: "settings", label: "Settings", description: "App settings", icon: Settings, category: "navigation", keywords: ["preferences", "configuration"] },
  { id: "profile", label: "Profile", description: "Your profile", icon: User, category: "navigation", keywords: ["account", "user"] },
];

// Quick actions
const quickActions: Omit<CommandItem, "onSelect">[] = [
  { id: "add-property", label: "Add Property", description: "Create a new property", icon: Plus, category: "action", shortcut: "P" },
  { id: "add-tenant", label: "Add Tenant", description: "Add a new tenant", icon: Plus, category: "action", shortcut: "T" },
  { id: "add-lease", label: "Add Lease", description: "Create a new lease", icon: Plus, category: "action", shortcut: "L" },
  { id: "add-receipt", label: "Record Payment", description: "Record a payment", icon: Plus, category: "action", shortcut: "R" },
  { id: "add-maintenance", label: "New Maintenance Request", description: "Create maintenance ticket", icon: Plus, category: "action", shortcut: "M" },
];

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onAction,
  searchResults,
  onSearch,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command items
  const allItems = useMemo(() => {
    const navItems: CommandItem[] = navigationItems.map((item) => ({
      ...item,
      onSelect: () => {
        onNavigate(item.id);
        onClose();
      },
    }));

    const actionItems: CommandItem[] = quickActions.map((item) => ({
      ...item,
      onSelect: () => {
        if (onAction) {
          onAction(item.id);
        }
        // Navigate to relevant section and trigger add
        const sectionMap: Record<string, string> = {
          "add-property": "properties",
          "add-tenant": "tenants",
          "add-lease": "leases",
          "add-receipt": "receipts",
          "add-maintenance": "maintenance",
        };
        if (sectionMap[item.id]) {
          onNavigate(sectionMap[item.id]);
        }
        onClose();
      },
    }));

    return [...navItems, ...actionItems];
  }, [onNavigate, onAction, onClose]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return allItems;
    }

    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(lowerQuery);
      const matchDescription = item.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));
      return matchLabel || matchDescription || matchKeywords;
    });
  }, [query, allItems]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      search: [],
    };

    filteredItems.forEach((item) => {
      groups[item.category].push(item);
    });

    // Add search results if available
    if (searchResults && query.trim()) {
      if (searchResults.properties?.length) {
        searchResults.properties.forEach((p) => {
          groups.search.push({
            id: `property-${p.id}`,
            label: p.name,
            description: p.address || "Property",
            icon: Building2,
            category: "search",
            onSelect: () => {
              onNavigate("properties");
              onClose();
            },
          });
        });
      }
      if (searchResults.tenants?.length) {
        searchResults.tenants.forEach((t) => {
          groups.search.push({
            id: `tenant-${t.id}`,
            label: t.name,
            description: t.email || "Tenant",
            icon: Users,
            category: "search",
            onSelect: () => {
              onNavigate("tenants");
              onClose();
            },
          });
        });
      }
    }

    return groups;
  }, [filteredItems, searchResults, query, onNavigate, onClose]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => {
    return [
      ...groupedItems.navigation,
      ...groupedItems.action,
      ...groupedItems.search,
    ];
  }, [groupedItems]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Trigger search callback
  useEffect(() => {
    if (onSearch && query.trim()) {
      const timer = setTimeout(() => onSearch(query), 300);
      return () => clearTimeout(timer);
    }
  }, [query, onSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flatItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            flatItems[selectedIndex].onSelect();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatItems, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const renderGroup = (title: string, items: CommandItem[], startIndex: number) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          {title}
        </div>
        {items.map((item, idx) => {
          const globalIndex = startIndex + idx;
          const Icon = item.icon;
          const isSelected = globalIndex === selectedIndex;

          return (
            <button
              key={item.id}
              data-index={globalIndex}
              onClick={item.onSelect}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                isSelected
                  ? "bg-accent-primary/20 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-accent-primary" : "text-zinc-500")} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-zinc-500 truncate">{item.description}</div>
                )}
              </div>
              {item.shortcut && (
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                  <Command className="h-3 w-3" />
                  {item.shortcut}
                </kbd>
              )}
              {isSelected && <ArrowRight className="h-4 w-4 text-accent-primary" />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-modal)]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-xl max-h-[70vh] min-h-[200px] z-[var(--z-modal)]"
          >
            <div className="mx-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] flex-none">
                <Search className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search or type a command..."
                  className="flex-1 bg-transparent text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] outline-none text-sm"
                />
                <button
                  onClick={onClose}
                  className="p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                  aria-label="Close command palette"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {flatItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[var(--color-muted-foreground)]">
                    No results found for &quot;{query}&quot;
                  </div>
                ) : (
                  <>
                    {renderGroup("Navigation", groupedItems.navigation, 0)}
                    {renderGroup(
                      "Quick Actions",
                      groupedItems.action,
                      groupedItems.navigation.length
                    )}
                    {renderGroup(
                      "Search Results",
                      groupedItems.search,
                      groupedItems.navigation.length + groupedItems.action.length
                    )}
                  </>
                )}
                {/* Fade gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--color-card)] to-transparent pointer-events-none" />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] flex-none">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[var(--color-hover)] rounded">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[var(--color-hover)] rounded">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[var(--color-hover)] rounded">esc</kbd>
                    close
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Command className="h-3 w-3" />
                  <span>K to open</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manage command palette state with keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
