"use client";

import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: "1", ctrl: true, action: () => navigate("overview"), description: "Go to Dashboard" },
 *     { key: "2", ctrl: true, action: () => navigate("properties"), description: "Go to Properties" },
 *   ]
 * });
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey;
        const metaMatch = shortcut.meta ? event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        // For shortcuts with ctrl, we accept both ctrl and meta (for Mac compatibility)
        const modifierMatch = shortcut.ctrl
          ? (event.ctrlKey || event.metaKey) && shiftMatch && altMatch
          : ctrlMatch && metaMatch && shiftMatch && altMatch;

        if (keyMatch && modifierMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [enabled, preventDefault]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for navigation keyboard shortcuts (Ctrl+1-9)
 */
export function useNavigationShortcuts(onNavigate: (tabId: string) => void) {
  const navigationMap: Record<string, string> = {
    "1": "overview",
    "2": "properties",
    "3": "tenants",
    "4": "leases",
    "5": "financials",
    "6": "maintenance",
    "7": "analytics",
    "8": "reports",
    "9": "settings",
  };

  const shortcuts: KeyboardShortcut[] = Object.entries(navigationMap).map(
    ([key, tabId]) => ({
      key,
      ctrl: true,
      action: () => onNavigate(tabId),
      description: `Go to ${tabId}`,
    })
  );

  // Add escape to close modals (handled separately)
  shortcuts.push({
    key: "Escape",
    action: () => {
      // Dispatch custom event for modal closing
      document.dispatchEvent(new CustomEvent("close-modals"));
    },
    description: "Close modals",
  });

  useKeyboardShortcuts({ shortcuts });

  return { navigationMap, shortcuts };
}

/**
 * Hook to listen for escape key to close modals/dialogs
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useKeyboardShortcuts({
    shortcuts: [{ key: "Escape", action: onEscape }],
    enabled,
  });
}

/**
 * Hook for listening to close-modals event
 */
export function useCloseModals(onClose: () => void) {
  useEffect(() => {
    const handleCloseModals = () => onClose();
    document.addEventListener("close-modals", handleCloseModals);
    return () => document.removeEventListener("close-modals", handleCloseModals);
  }, [onClose]);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  // Use ⌘ for Mac, Ctrl for others
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (shortcut.shift) {
    parts.push("⇧");
  }
  
  // Format key nicely
  let keyDisplay = shortcut.key;
  if (shortcut.key === "Escape") keyDisplay = "Esc";
  if (shortcut.key === "Enter") keyDisplay = "↵";
  if (shortcut.key === "ArrowUp") keyDisplay = "↑";
  if (shortcut.key === "ArrowDown") keyDisplay = "↓";
  if (shortcut.key === "ArrowLeft") keyDisplay = "←";
  if (shortcut.key === "ArrowRight") keyDisplay = "→";
  
  parts.push(keyDisplay.toUpperCase());
  
  return parts.join(isMac ? "" : "+");
}

/**
 * Get all available shortcuts for help display
 */
export function getAvailableShortcuts(): { category: string; shortcuts: { keys: string; description: string }[] }[] {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl+";

  return [
    {
      category: "Navigation",
      shortcuts: [
        { keys: `${mod}K`, description: "Open command palette" },
        { keys: `${mod}1`, description: "Go to Dashboard" },
        { keys: `${mod}2`, description: "Go to Properties" },
        { keys: `${mod}3`, description: "Go to Tenants" },
        { keys: `${mod}4`, description: "Go to Leases" },
        { keys: `${mod}5`, description: "Go to Financials" },
        { keys: `${mod}6`, description: "Go to Maintenance" },
        { keys: `${mod}7`, description: "Go to Analytics" },
        { keys: `${mod}8`, description: "Go to Reports" },
        { keys: `${mod}9`, description: "Go to Settings" },
      ],
    },
    {
      category: "General",
      shortcuts: [
        { keys: "Esc", description: "Close modal/dialog" },
        { keys: "↑↓", description: "Navigate lists" },
        { keys: "↵", description: "Select/confirm" },
      ],
    },
  ];
}
