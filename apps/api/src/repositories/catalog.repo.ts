import { store } from '../store/inMemoryStore.js';
import type {
  CatalogServiceRecord,
  CatalogEffectRecord,
  NailLengthRecord,
  ServiceCategory,
  EffectType,
} from '../types/index.js';
import type {
  CreateServiceInput,
  UpdateServiceInput,
  CreateEffectInput,
  UpdateEffectInput,
  CreateLengthInput,
  UpdateLengthInput,
} from '../validators/catalog.validators.js';

export const catalogRepo = {
  // Services
  listServices(category?: ServiceCategory, includeInactive = false): CatalogServiceRecord[] {
    const all = [...store.catalogServices.values()];
    return all.filter((s) => (category ? s.category === category : true) && (includeInactive ? true : s.active));
  },
  findService(id: string): CatalogServiceRecord | null {
    return store.catalogServices.get(id) ?? null;
  },
  createService(input: CreateServiceInput): CatalogServiceRecord {
    const rec: CatalogServiceRecord = {
      id: store.newId(),
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      basePrice: input.basePrice,
      baseDurationMin: input.baseDurationMin,
      removalPrice: input.removalPrice ?? 0,
      removalDurationMin: input.removalDurationMin ?? 0,
      active: input.active ?? true,
    };
    store.catalogServices.set(rec.id, rec);
    return rec;
  },
  updateService(id: string, patch: UpdateServiceInput): CatalogServiceRecord | null {
    const rec = store.catalogServices.get(id);
    if (!rec) return null;
    if (patch.name !== undefined) rec.name = patch.name;
    if (patch.category !== undefined) rec.category = patch.category;
    if (patch.description !== undefined) rec.description = patch.description ?? null;
    if (patch.imageUrl !== undefined) rec.imageUrl = patch.imageUrl ?? null;
    if (patch.basePrice !== undefined) rec.basePrice = patch.basePrice;
    if (patch.baseDurationMin !== undefined) rec.baseDurationMin = patch.baseDurationMin;
    if (patch.removalPrice !== undefined) rec.removalPrice = patch.removalPrice;
    if (patch.removalDurationMin !== undefined) rec.removalDurationMin = patch.removalDurationMin;
    if (patch.active !== undefined) rec.active = patch.active;
    store.catalogServices.set(id, rec);
    return rec;
  },
  deleteService(id: string): boolean {
    return store.catalogServices.delete(id);
  },

  // Effects
  listEffects(type?: EffectType, includeInactive = false): CatalogEffectRecord[] {
    const all = [...store.catalogEffects.values()];
    return all.filter((e) => (type ? e.type === type : true) && (includeInactive ? true : e.active));
  },
  findEffect(id: string): CatalogEffectRecord | null {
    return store.catalogEffects.get(id) ?? null;
  },
  createEffect(input: CreateEffectInput): CatalogEffectRecord {
    const rec: CatalogEffectRecord = {
      id: store.newId(),
      name: input.name,
      type: input.type,
      price: input.price,
      durationMin: input.durationMin,
      active: input.active ?? true,
      imageUrl: input.imageUrl ?? null,
    };
    store.catalogEffects.set(rec.id, rec);
    return rec;
  },
  updateEffect(id: string, patch: UpdateEffectInput): CatalogEffectRecord | null {
    const rec = store.catalogEffects.get(id);
    if (!rec) return null;
    if (patch.name !== undefined) rec.name = patch.name;
    if (patch.type !== undefined) rec.type = patch.type;
    if (patch.price !== undefined) rec.price = patch.price;
    if (patch.durationMin !== undefined) rec.durationMin = patch.durationMin;
    if (patch.active !== undefined) rec.active = patch.active;
    if (patch.imageUrl !== undefined) rec.imageUrl = patch.imageUrl ?? null;
    store.catalogEffects.set(id, rec);
    return rec;
  },
  deleteEffect(id: string): boolean {
    return store.catalogEffects.delete(id);
  },

  // Lengths
  listLengths(includeInactive = false): NailLengthRecord[] {
    const all = [...store.nailLengths.values()];
    return all.filter((l) => (includeInactive ? true : l.active));
  },
  findLengthByCode(code: string): NailLengthRecord | null {
    return [...store.nailLengths.values()].find((l) => l.code === code) ?? null;
  },
  findLength(id: string): NailLengthRecord | null {
    return store.nailLengths.get(id) ?? null;
  },
  createLength(input: CreateLengthInput): NailLengthRecord {
    const rec: NailLengthRecord = {
      id: store.newId(),
      code: input.code,
      label: input.label,
      priceModifier: input.priceModifier,
      durationModifier: input.durationModifier,
      active: input.active ?? true,
    };
    store.nailLengths.set(rec.id, rec);
    return rec;
  },
  updateLength(id: string, patch: UpdateLengthInput): NailLengthRecord | null {
    const rec = store.nailLengths.get(id);
    if (!rec) return null;
    if (patch.code !== undefined) rec.code = patch.code;
    if (patch.label !== undefined) rec.label = patch.label;
    if (patch.priceModifier !== undefined) rec.priceModifier = patch.priceModifier;
    if (patch.durationModifier !== undefined) rec.durationModifier = patch.durationModifier;
    if (patch.active !== undefined) rec.active = patch.active;
    store.nailLengths.set(id, rec);
    return rec;
  },
  deleteLength(id: string): boolean {
    return store.nailLengths.delete(id);
  },
};