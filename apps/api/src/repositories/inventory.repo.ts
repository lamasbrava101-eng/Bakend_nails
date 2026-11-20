import { store } from '../store/inMemoryStore.js';
import type { InventoryItemRecord } from '../types/index.js';

export const inventoryRepo = {
  list(includeDeleted = false): InventoryItemRecord[] {
    return [...store.inventoryItems.values()].filter((i) => includeDeleted || !i.deletedAt);
  },
  find(id: string): InventoryItemRecord | null {
    const i = store.inventoryItems.get(id);
    if (!i || i.deletedAt) return null;
    return i;
  },
  create(rec: InventoryItemRecord): InventoryItemRecord {
    store.inventoryItems.set(rec.id, rec);
    return rec;
  },
  update(id: string, patch: Partial<InventoryItemRecord>): InventoryItemRecord | null {
    const rec = store.inventoryItems.get(id);
    if (!rec || rec.deletedAt) return null;
    const updated = { ...rec, ...patch };
    store.inventoryItems.set(id, updated);
    return updated;
  },
  delete(id: string): boolean {
    const rec = store.inventoryItems.get(id);
    if (!rec || rec.deletedAt) return false;
    rec.deletedAt = new Date().toISOString();
    store.inventoryItems.set(id, rec);
    return true;
  },
};