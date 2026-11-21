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
      ? { ...existing, updatedAt: now }
      : {
          id: store.newId(),
          clientId,
          allergies: null,
          nailType: null,
          preferredTones: null,
          photoUrl: null,
          updatedAt: now,
        };
    // Perfil simplificado: solo alergias; el resto se mantiene limpio
    if (patch.allergies !== undefined) sheet.allergies = patch.allergies ?? null;
    sheet.nailType = null;
    sheet.preferredTones = null;
    sheet.photoUrl = null;
    sheet.updatedAt = now;
    store.techSheets.set(clientId, sheet);
    return sheet;
  },
};