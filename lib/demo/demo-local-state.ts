/**
 * Demo Local State Store
 *
 * SessionStorage-backed mutable store for demo mode.
 * Initializes from DEMO_DATA_MAP fixtures, persists mutations within the
 * browser session, and resets to defaults on exit or explicit reset.
 */

import type { DemoEntityType } from "./demo-data";
import {
  DEMO_PROPERTIES,
  DEMO_TENANTS,
  DEMO_RECEIPTS,
  DEMO_DOCUMENTS,
  DEMO_TEMPLATES,
  DEMO_CORRESPONDENCE,
  DEMO_OWNERS,
  DEMO_EXPENSES,
  DEMO_MAINTENANCE,
  DEMO_LEASES,
} from "./demo-data";

const STORAGE_KEY = "proman_demo_store";

interface DemoStore {
  properties: unknown[];
  tenants: unknown[];
  receipts: unknown[];
  documents: unknown[];
  templates: unknown[];
  correspondence: unknown[];
  owners: unknown[];
  expenses: unknown[];
  maintenance: unknown[];
  leases: unknown[];
  contacts: unknown[];
}

function getDefaultStore(): DemoStore {
  return {
    properties: JSON.parse(JSON.stringify(DEMO_PROPERTIES)),
    tenants: JSON.parse(JSON.stringify(DEMO_TENANTS)),
    receipts: JSON.parse(JSON.stringify(DEMO_RECEIPTS)),
    documents: JSON.parse(JSON.stringify(DEMO_DOCUMENTS)),
    templates: JSON.parse(JSON.stringify(DEMO_TEMPLATES)),
    correspondence: JSON.parse(JSON.stringify(DEMO_CORRESPONDENCE)),
    owners: JSON.parse(JSON.stringify(DEMO_OWNERS)),
    expenses: JSON.parse(JSON.stringify(DEMO_EXPENSES)),
    maintenance: JSON.parse(JSON.stringify(DEMO_MAINTENANCE)),
    leases: JSON.parse(JSON.stringify(DEMO_LEASES)),
    contacts: [],
  };
}

function loadStore(): DemoStore {
  if (typeof window === "undefined") return getDefaultStore();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoStore;
  } catch {
    // Corrupted — reset
  }
  return getDefaultStore();
}

function saveStore(store: DemoStore): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// Module-level cache (avoids repeated parsing)
let _store: DemoStore | null = null;

function getStore(): DemoStore {
  if (!_store) _store = loadStore();
  return _store;
}

/**
 * Get all demo entities for a given type. Returns a deep copy.
 */
export function getDemoStoreData<T = unknown>(entityType: DemoEntityType): T[] {
  const store = getStore();
  const data = store[entityType as keyof DemoStore];
  if (!data) return [];
  return JSON.parse(JSON.stringify(data)) as T[];
}

/**
 * Get a single demo entity by ID. Returns a deep copy or null.
 */
export function getDemoStoreDataById<T extends { id: string }>(
  entityType: DemoEntityType,
  id: string,
): T | null {
  const store = getStore();
  const data = store[entityType as keyof DemoStore] as T[];
  const item = data?.find((d) => d.id === id);
  return item ? (JSON.parse(JSON.stringify(item)) as T) : null;
}

/**
 * Add an entity to the demo store. Returns the created entity with generated fields.
 */
export function addDemoEntity<T extends { id: string }>(
  entityType: DemoEntityType,
  data: Partial<T>,
): T {
  const store = getStore();
  const now = new Date().toISOString();
  const entity = {
    ...data,
    id: data.id || `demo-${entityType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: "demo-user",
    createdAt: now,
    updatedAt: now,
  } as unknown as T;

  const list = store[entityType as keyof DemoStore] as unknown[];
  list.unshift(entity);
  saveStore(store);
  return JSON.parse(JSON.stringify(entity)) as T;
}

/**
 * Update an entity in the demo store. Returns the updated entity or null if not found.
 */
export function updateDemoEntity<T extends { id: string }>(
  entityType: DemoEntityType,
  id: string,
  data: Partial<T>,
): T | null {
  const store = getStore();
  const list = store[entityType as keyof DemoStore] as T[];
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const updated = {
    ...list[index],
    ...data,
    id, // Don't allow changing the ID
    updatedAt: new Date().toISOString(),
  } as T;
  list[index] = updated;
  saveStore(store);
  return JSON.parse(JSON.stringify(updated)) as T;
}

/**
 * Remove an entity from the demo store. Returns true if found and removed.
 */
export function removeDemoEntity(entityType: DemoEntityType, id: string): boolean {
  const store = getStore();
  const list = store[entityType as keyof DemoStore] as { id: string }[];
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return false;

  list.splice(index, 1);
  saveStore(store);
  return true;
}

/**
 * Reset the demo store to default fixtures. Clears sessionStorage cache.
 */
export function resetDemoStore(): void {
  _store = getDefaultStore();
  saveStore(_store);
}

/**
 * Clear the demo store completely (called on demo exit).
 */
export function clearDemoStore(): void {
  _store = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
