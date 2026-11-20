import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { loadFromDisk, saveToDisk, type PersistedData } from './persistence.js';
import type {
  UserRecord,
  RefreshTokenRecord,
  TechSheetRecord,
  CatalogServiceRecord,
  CatalogEffectRecord,
  NailLengthRecord,
  AppointmentRecord,
  AppointmentLogRecord,
  InventoryItemRecord,
  StudioConfigRecord,
} from '../types/index.js';

const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export class InMemoryStore {
  users = new Map<string, UserRecord>();
  userEmailIndex = new Map<string, string>();
  refreshTokens = new Map<string, RefreshTokenRecord>();
  refreshTokenHashIndex = new Map<string, string>();
  techSheets = new Map<string, TechSheetRecord>();

  catalogServices = new Map<string, CatalogServiceRecord>();
  catalogEffects = new Map<string, CatalogEffectRecord>();
  nailLengths = new Map<string, NailLengthRecord>();

  appointments = new Map<string, AppointmentRecord>();
  appointmentLogs = new Map<string, AppointmentLogRecord[]>();
  inventoryItems = new Map<string, InventoryItemRecord>();

  private _studioConfig: StudioConfigRecord = {
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    accountType: '',
    idNumber: '',
    instructions: '',
  };

  private persistTimer: NodeJS.Timeout | null = null;
  private dataFile: string;

  constructor() {
    this.dataFile = path.resolve(env.dataDir, 'store.json');
    this.wrapAllMaps();
    this.seedUsers();
    this.seedCatalog();
    this.seedStudioConfig();
    this.loadPersisted();
  }

  get studioConfig(): StudioConfigRecord {
    return this._studioConfig;
  }
  set studioConfig(v: StudioConfigRecord) {
    this._studioConfig = v;
    this.schedulePersist();
  }
  setStudioConfig(patch: Partial<StudioConfigRecord>): void {
    this._studioConfig = { ...this._studioConfig, ...patch };
    this.schedulePersist();
  }

  private wrapMap<K, V>(map: Map<K, V>): void {
    const origSet = map.set.bind(map);
    const origDelete = map.delete.bind(map);
    const origClear = map.clear.bind(map);
    map.set = (k: K, v: V) => {
      const r = origSet(k, v);
      this.schedulePersist();
      return r;
    };
    map.delete = (k: K) => {
      const r = origDelete(k);
      if (r) this.schedulePersist();
      return r;
    };
    map.clear = () => {
      origClear();
      this.schedulePersist();
    };
  }

  private wrapAllMaps(): void {
    this.wrapMap(this.users);
    this.wrapMap(this.userEmailIndex);
    this.wrapMap(this.refreshTokens);
    this.wrapMap(this.refreshTokenHashIndex);
    this.wrapMap(this.techSheets);
    this.wrapMap(this.catalogServices);
    this.wrapMap(this.catalogEffects);
    this.wrapMap(this.nailLengths);
    this.wrapMap(this.appointments);
    this.wrapMap(this.appointmentLogs);
    this.wrapMap(this.inventoryItems);
  }

  private schedulePersist(): void {
    if (!env.persistenceEnabled) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistNow();
    }, 250);
  }

  persistNow(): void {
    if (!env.persistenceEnabled) return;
    const data: PersistedData = {
      users: [...this.users.entries()],
      userEmailIndex: [...this.userEmailIndex.entries()],
      refreshTokens: [...this.refreshTokens.entries()],
      refreshTokenHashIndex: [...this.refreshTokenHashIndex.entries()],
      techSheets: [...this.techSheets.entries()],
      catalogServices: [...this.catalogServices.entries()],
      catalogEffects: [...this.catalogEffects.entries()],
      nailLengths: [...this.nailLengths.entries()],
      appointments: [...this.appointments.entries()],
      appointmentLogs: [...this.appointmentLogs.entries()],
      inventoryItems: [...this.inventoryItems.entries()],
      studioConfig: this._studioConfig,
    };
    saveToDisk(this.dataFile, data);
  }

  private loadPersisted(): void {
    if (!env.persistenceEnabled) return;
    const data = loadFromDisk(this.dataFile);
    if (!data) {
      this.persistNow();
      return;
    }
    try {
      this.replaceMap(this.users, data.users as [string, UserRecord][]);
      this.replaceMap(this.userEmailIndex, data.userEmailIndex as [string, string][]);
      this.replaceMap(this.refreshTokens, data.refreshTokens as [string, RefreshTokenRecord][]);
      this.replaceMap(this.refreshTokenHashIndex, data.refreshTokenHashIndex as [string, string][]);
      this.replaceMap(this.techSheets, data.techSheets as [string, TechSheetRecord][]);
      this.replaceMap(this.catalogServices, data.catalogServices as [string, CatalogServiceRecord][]);
      this.replaceMap(this.catalogEffects, data.catalogEffects as [string, CatalogEffectRecord][]);
      this.replaceMap(this.nailLengths, data.nailLengths as [string, NailLengthRecord][]);
      this.replaceMap(this.appointments, data.appointments as [string, AppointmentRecord][]);
      this.replaceMap(this.appointmentLogs, data.appointmentLogs as [string, AppointmentLogRecord[]][]);
      this.replaceMap(this.inventoryItems, data.inventoryItems as [string, InventoryItemRecord][]);
      if (data.studioConfig) this._studioConfig = data.studioConfig as StudioConfigRecord;
    } catch {
      // if load fails, keep seeded defaults
      this.persistNow();
    }
  }

  private replaceMap<K, V>(map: Map<K, V>, entries: [K, V][] | undefined): void {
    const origClear = Map.prototype.clear.call.bind(Map.prototype.clear) as (m: Map<K, V>) => void;
    const origSet = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<K, V>, k: K, v: V) => Map<K, V>;
    // clear without triggering wrapped clear's persist
    origClear(map);
    if (entries) {
      for (const [k, v] of entries) origSet(map, k, v);
    }
  }

  reset(): void {
    // clear via prototype to avoid scheduling persists during reset
    const clear = <K, V>(m: Map<K, V>) => Map.prototype.clear.call(m);
    clear(this.users);
    clear(this.userEmailIndex);
    clear(this.refreshTokens);
    clear(this.refreshTokenHashIndex);
    clear(this.techSheets);
    clear(this.catalogServices);
    clear(this.catalogEffects);
    clear(this.nailLengths);
    clear(this.appointments);
    clear(this.appointmentLogs);
    clear(this.inventoryItems);
    this.seedUsers();
    this.seedCatalog();
    this.seedStudioConfig();
  }

  newId(): string {
    return crypto.randomUUID();
  }

  private seedUsers(): void {
    const seeds: Array<{ email: string; password: string; role: 'CLIENT' | 'MANICURIST' | 'ADMIN'; firstName: string }> = [
      { email: 'admin@nailstudio.com', password: 'Admin1234', role: 'ADMIN', firstName: 'Administradora' },
      { email: 'manicurist@nailstudio.com', password: 'Manicura1234', role: 'MANICURIST', firstName: 'Manicurista' },
      { email: 'clienta@nailstudio.com', password: 'Clienta1234', role: 'CLIENT', firstName: 'Clienta' },
    ];
    const origSetUsers = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<string, UserRecord>, k: string, v: UserRecord) => Map<string, UserRecord>;
    const origSetIdx = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<string, string>, k: string, v: string) => Map<string, string>;
    const origSetTs = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<string, TechSheetRecord>, k: string, v: TechSheetRecord) => Map<string, TechSheetRecord>;
    for (const s of seeds) {
      const id = this.newId();
      const user: UserRecord = {
        id,
        email: s.email.toLowerCase(),
        passwordHash: bcrypt.hashSync(s.password, env.bcryptRounds),
        role: s.role,
        firstName: s.firstName,
        lastName: null,
        phone: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      origSetUsers(this.users, id, user);
      origSetIdx(this.userEmailIndex, user.email, id);
      const tech: TechSheetRecord = {
        id: this.newId(),
        clientId: id,
        allergies: null,
        nailType: null,
        preferredTones: null,
        photoUrl: null,
        updatedAt: new Date().toISOString(),
      };
      origSetTs(this.techSheets, id, tech);
    }
  }

  private seedStudioConfig(): void {
    this._studioConfig = {
      bankName: 'Banco Pichincha',
      accountHolder: 'NailStudio',
      accountNumber: '1234567890',
      accountType: 'Ahorros',
      idNumber: '1234567890',
      instructions: 'Transferir $5.00 y subir comprobante.',
    };
  }

  private seedCatalog(): void {
    const NAIL_A = 'photo-1604654894610-df63bc536371';
    const NAIL_B = 'photo-1519014816548-bf5fe059798b';
    const origSetS = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<string, CatalogServiceRecord>, k: string, v: CatalogServiceRecord) => Map<string, CatalogServiceRecord>;
    const origSetE = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<string, CatalogEffectRecord>, k: string, v: CatalogEffectRecord) => Map<string, CatalogEffectRecord>;
    const origSetL = Map.prototype.set.call.bind(Map.prototype.set) as (m: Map<string, NailLengthRecord>, k: string, v: NailLengthRecord) => Map<string, NailLengthRecord>;

    const services: Array<Omit<CatalogServiceRecord, 'id'>> = [
      { name: 'Manicura Clásica', category: 'SEMI_PERMANENT', description: 'Limpieza, limado y esmalte tradicional.', imageUrl: UNSPLASH(NAIL_A), basePrice: 8, baseDurationMin: 30, removalPrice: 3, removalDurationMin: 15, active: true },
      { name: 'Manicura Semipermanente', category: 'SEMI_PERMANENT', description: 'Esmalte semipermanente de larga duración.', imageUrl: UNSPLASH(NAIL_B), basePrice: 12, baseDurationMin: 45, removalPrice: 3, removalDurationMin: 15, active: true },
      { name: 'Acrílicas Naturales', category: 'ACRYLIC', description: 'Extensiones acrílicas con acabado natural.', imageUrl: UNSPLASH(NAIL_A), basePrice: 20, baseDurationMin: 90, removalPrice: 5, removalDurationMin: 30, active: true },
      { name: 'Acrílicas con Diseño', category: 'ACRYLIC', description: 'Acrílicas con arte y decoración.', imageUrl: UNSPLASH(NAIL_B), basePrice: 25, baseDurationMin: 120, removalPrice: 5, removalDurationMin: 30, active: true },
      { name: 'Soft Gel Corto', category: 'SOFT_GEL', description: 'Soft gel de duración media, acabado suave.', imageUrl: UNSPLASH(NAIL_A), basePrice: 15, baseDurationMin: 60, removalPrice: 4, removalDurationMin: 20, active: true },
      { name: 'Soft Gel Largo', category: 'SOFT_GEL', description: 'Soft gel para uñas largas.', imageUrl: UNSPLASH(NAIL_B), basePrice: 18, baseDurationMin: 75, removalPrice: 4, removalDurationMin: 20, active: true },
      { name: 'Nail Art Minimalista', category: 'NAIL_ART', description: 'Diseños minimalistas a mano alzada.', imageUrl: UNSPLASH(NAIL_A), basePrice: 10, baseDurationMin: 40, removalPrice: 3, removalDurationMin: 15, active: true },
      { name: 'Nail Art Premium', category: 'NAIL_ART', description: 'Arte detallado con piedras y efectos.', imageUrl: UNSPLASH(NAIL_B), basePrice: 22, baseDurationMin: 90, removalPrice: 3, removalDurationMin: 15, active: true },
    ];

    const effects: Array<Omit<CatalogEffectRecord, 'id'>> = [
      { name: 'Efecto Mate', type: 'EFFECT', price: 3, durationMin: 10, active: true, imageUrl: UNSPLASH(NAIL_A) },
      { name: 'Efecto Glossy', type: 'EFFECT', price: 2, durationMin: 5, active: true, imageUrl: UNSPLASH(NAIL_B) },
      { name: 'Cromo / Mirror', type: 'EFFECT', price: 5, durationMin: 15, active: true, imageUrl: UNSPLASH(NAIL_A) },
      { name: 'Piedras y Stickers', type: 'EFFECT', price: 4, durationMin: 15, active: true, imageUrl: UNSPLASH(NAIL_B) },
      { name: 'Baby Boomer', type: 'EFFECT', price: 6, durationMin: 20, active: true, imageUrl: UNSPLASH(NAIL_A) },
      { name: 'Retiro de esmalte previo', type: 'REMOVAL', price: 3, durationMin: 15, active: true, imageUrl: UNSPLASH(NAIL_B) },
    ];

    const lengths: Array<Omit<NailLengthRecord, 'id'>> = [
      { code: 'S', label: 'Corto', priceModifier: 0, durationModifier: 0, active: true },
      { code: 'M', label: 'Mediano', priceModifier: 2, durationModifier: 10, active: true },
      { code: 'L', label: 'Largo', priceModifier: 4, durationModifier: 20, active: true },
      { code: 'XL', label: 'Extra Largo', priceModifier: 6, durationModifier: 30, active: true },
    ];

    for (const s of services) {
      const rec: CatalogServiceRecord = { id: this.newId(), ...s };
      origSetS(this.catalogServices, rec.id, rec);
    }
    for (const e of effects) {
      const rec: CatalogEffectRecord = { id: this.newId(), ...e };
      origSetE(this.catalogEffects, rec.id, rec);
    }
    for (const l of lengths) {
      const rec: NailLengthRecord = { id: this.newId(), ...l };
      origSetL(this.nailLengths, rec.id, rec);
    }
  }
}

export const store = new InMemoryStore();

export function resetStore(): void {
  store.reset();
}