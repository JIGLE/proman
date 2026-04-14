"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  Building2,
  Users,
  FileText,
  Wrench,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { useApp } from "@/lib/contexts/app-context";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "action" | "property" | "tenant" | "lease" | "navigation";
  href?: string;
  onSelect?: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { state } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "pt";

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items
  const items = useMemo<CommandItem[]>(() => {
    const actions: CommandItem[] = [
      {
        id: "add-property",
        label: "Add Property",
        description: "Create a new property listing",
        icon: Plus,
        category: "action",
        href: `/${locale}/properties`,
      },
      {
        id: "add-tenant",
        label: "Add Tenant",
        description: "Register a new tenant",
        icon: Plus,
        category: "action",
        href: `/${locale}/tenants`,
      },
      {
        id: "add-lease",
        label: "Create Lease",
        description: "Draft a new lease agreement",
        icon: Plus,
        category: "action",
        href: `/${locale}/leases`,
      },
      {
        id: "record-payment",
        label: "Record Payment",
        description: "Log a rent payment",
        icon: DollarSign,
        category: "action",
        href: `/${locale}/financials`,
      },
      {
        id: "log-maintenance",
        label: "Log Maintenance",
        description: "Create a maintenance ticket",
        icon: Wrench,
        category: "action",
        href: `/${locale}/maintenance`,
      },
    ];

    const navigation: CommandItem[] = [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        icon: Building2,
        category: "navigation",
        href: `/${locale}/overview`,
      },
      {
        id: "nav-properties",
        label: "Properties",
        icon: Building2,
        category: "navigation",
        href: `/${locale}/properties`,
      },
      {
        id: "nav-tenants",
        label: "Tenants",
        icon: Users,
        category: "navigation",
        href: `/${locale}/tenants`,
      },
      {
        id: "nav-leases",
        label: "Leases",
        icon: FileText,
        category: "navigation",
        href: `/${locale}/leases`,
      },
      {
        id: "nav-finance",
        label: "Finance",
        icon: DollarSign,
        category: "navigation",
        href: `/${locale}/financials`,
      },
      {
        id: "nav-maintenance",
        label: "Maintenance",
        icon: Wrench,
        category: "navigation",
        href: `/${locale}/maintenance`,
      },
    ];

    const propertyItems: CommandItem[] = state.properties.map((p) => ({
      id: `property-${p.id}`,
      label: p.name,
      description: p.address,
      icon: Building2,
      category: "property" as const,
      href: `/${locale}/properties/${p.id}`,
    }));

    const tenantItems: CommandItem[] = state.tenants.map((t) => ({
      id: `tenant-${t.id}`,
      label: t.name,
      description: t.email,
      icon: Users,
      category: "tenant" as const,
      href: `/${locale}/tenants/${t.id}`,
    }));

    return [...actions, ...navigation, ...propertyItems, ...tenantItems];
  }, [state.properties, state.tenants, locale]);

  // Filter
  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 10);
    const q = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [items, query]);

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setIsOpen(false);
      if (item.onSelect) {
        item.onSelect();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const categoryLabels: Record<string, string> = {
    action: "Quick Actions",
    navigation: "Navigation",
    property: "Properties",
    tenant: "Tenants",
    lease: "Leases",
  };

  if (!isOpen) return null;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-lg bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <Search className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type a command..."
              className="flex-1 bg-transparent text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-[var(--color-muted)] text-[10px] font-mono text-[var(--color-muted-foreground)]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                No results found
              </p>
            )}

            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                    {categoryLabels[category] || category}
                  </span>
                </div>
                {categoryItems.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors",
                        idx === selectedIndex
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-muted-foreground)]">
            <span>↑↓ navigate · ↵ select · esc close</span>
            <span>⌘K to toggle</span>
          </div>
        </div>
      </div>
    </>
  );
}
