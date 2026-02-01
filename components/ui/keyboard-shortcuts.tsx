"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/utils";
import { X, Command, HelpCircle } from "lucide-react";
import { Button } from "./button";

interface KeyboardShortcut {
  key: string;
  description: string;
  category: "Navigation" | "Actions" | "General";
  modifiers?: string[];
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: "K", description: "Open command palette", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  { key: "/", description: "Focus search", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  { key: "1", description: "Go to Dashboard", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  { key: "2", description: "Go to Properties", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  { key: "3", description: "Go to Tenants", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  { key: "4", description: "Go to Finance", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  { key: "5", description: "Go to Maintenance", category: "Navigation", modifiers: ["⌘", "Ctrl"] },
  
  // Actions
  { key: "N", description: "Create new item", category: "Actions", modifiers: ["⌘", "Ctrl"] },
  { key: "S", description: "Save changes", category: "Actions", modifiers: ["⌘", "Ctrl"] },
  { key: "Esc", description: "Close dialog/modal", category: "Actions" },
  
  // General
  { key: "?", description: "Show keyboard shortcuts", category: "General", modifiers: ["Shift"] },
  { key: "T", description: "Toggle theme", category: "General", modifiers: ["⌘", "Ctrl", "Shift"] },
];

export function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts overlay with Shift + ?
      if (e.key === "?" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-40",
          "md:bottom-4 md:right-4",
          "w-10 h-10 rounded-full",
          "bg-[var(--color-card)] border border-[var(--color-border)]",
          "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
          "shadow-lg hover:shadow-xl",
          "flex items-center justify-center",
          "transition-all duration-200 active:scale-90",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:outline-none"
        )}
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  const categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Shortcuts Panel */}
      <div
        className={cn(
          "fixed z-[var(--z-modal)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[calc(100%-2rem)] max-w-2xl max-h-[80vh]",
          "bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl",
          "animate-in zoom-in-95 duration-200",
          "flex flex-col overflow-hidden"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <Command className="h-5 w-5 text-accent-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-lg font-semibold text-[var(--color-foreground)]">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Master keyboard navigation for faster workflow
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
            aria-label="Close keyboard shortcuts"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="space-y-6">
            {Object.entries(categorizedShortcuts).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                  <span className="px-2">{category}</span>
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </h3>
                <div className="space-y-2">
                  {items.map((shortcut, index) => (
                    <div
                      key={`${shortcut.key}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-hover)] transition-colors"
                    >
                      <span className="text-sm text-[var(--color-foreground)]">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.modifiers?.map((mod, i) => (
                          <kbd
                            key={i}
                            className={cn(
                              "px-2 py-1 min-w-[2rem] rounded border text-xs font-mono text-center",
                              "bg-[var(--color-input)] border-[var(--color-border)]",
                              "text-[var(--color-foreground)] shadow-sm"
                            )}
                          >
                            {isMac && mod === "⌘" ? "⌘" : mod === "Ctrl" ? "Ctrl" : mod}
                          </kbd>
                        ))}
                        <kbd
                          className={cn(
                            "px-2 py-1 min-w-[2rem] rounded border text-xs font-mono text-center",
                            "bg-[var(--color-input)] border-[var(--color-border)]",
                            "text-[var(--color-foreground)] shadow-sm"
                          )}
                        >
                          {shortcut.key}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/50 flex-none">
          <p className="text-xs text-center text-[var(--color-muted-foreground)]">
            Press <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-foreground)] font-mono text-xs">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </>
  );
}
