"use client";

import { useState, useEffect, useCallback } from "react";

const RECENT_ITEMS_KEY = "proman.recent-items";
const MAX_RECENT = 5;

export interface RecentItem {
  id: string;
  label: string;
  href: string;
  type: "property" | "tenant" | "lease" | "payment" | "page";
  timestamp: number;
  icon?: string; // emoji or icon key
}

export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>([]);

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ITEMS_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const addRecentItem = useCallback((item: Omit<RecentItem, "timestamp">) => {
    setItems((prev) => {
      // Remove existing duplicate
      const filtered = prev.filter((i) => i.id !== item.id);
      const updated = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);

      try {
        localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }

      return updated;
    });
  }, []);

  const clearRecentItems = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(RECENT_ITEMS_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return { recentItems: items, addRecentItem, clearRecentItems };
}
