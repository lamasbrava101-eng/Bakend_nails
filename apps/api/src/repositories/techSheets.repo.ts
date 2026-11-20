import { store } from '../store/inMemoryStore.js';
import type { TechSheetRecord } from '../types/index.js';

export const techSheetsRepo = {
  async findByClient(clientId: string): Promise<TechSheetRecord | null> {
    return store.techSheets.get(clientId) ?? null;
  },

  async upsert(clientId: string, patch: Partial<Omit<TechSheetRecord, 'id' | 'clientId' | 'updatedAt'>>): Promise<TechSheetRecord> {
    const existing = store.techSheets.get(clientId);
    const now = new Date().toISOString();
    const sheet: TechSheetRecord = existing
      ? { ...existing, ...patch, updatedAt: now }
      : {
          id: store.newId(),
          clientId,
          allergies: patch.allergies ?? null,
          nailType: patch.nailType ?? null,
          preferredTones: patch.preferredTones ?? null,
          photoUrl: patch.photoUrl ?? null,
          updatedAt: now,
        };
    // apply patch fields explicitly
    if (patch.allergies !== undefined) sheet.allergies = patch.allergies ?? null;
    if (patch.nailType !== undefined) sheet.nailType = patch.nailType ?? null;
    if (patch.preferredTones !== undefined) sheet.preferredTones = patch.preferredTones ?? null;
    if (patch.photoUrl !== undefined) sheet.photoUrl = patch.photoUrl ?? null;
    sheet.updatedAt = now;
    store.techSheets.set(clientId, sheet);
    return sheet;
  },
};