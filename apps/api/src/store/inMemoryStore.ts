import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { loadFromDisk, saveToDisk, type PersistedData } from './persistence.js';
import type {
  UserRecord,
  RefreshTokenRecord,
  PasswordResetTokenRecord,
  TechSheetRecord,
  CatalogServiceRecord,
  CatalogEffectRecord,
  NailLengthRecord,
  AppointmentRecord,
  AppointmentLogRecord,
  InventoryItemRecord,
  StudioConfigRecord,
  BankAccountRecord,
  StudioShiftRecord,
  BlockedSlotRecord,
} from '../types/index.js';

const DEFAULT_SHIFTS: StudioShiftRecord[] = [
  { start: '08:00', end: '11:00', label: '08:00 - 11:00', active: true },
  { start: '11:00', end: '14:00', label: '11:00 - 14:00', active: true },
  { start: '14:00', end: '17:00', label: '14:00 - 17:00', active: true },
  { start: '17:00', end: '20:00', label: '17:00 - 20:00', active: true },
];

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // Lun-Sáb

const DEFAULT_BRAND_NAME = 'Nb_nails';
const DEFAULT_HOME_WELCOME_TITLE = 'Bienvenida a tu espacio';
const DEFAULT_HOME_WELCOME_SUBTITLE =
  'Desde aquí podrás acceder a tu perfil, catálogo, cotizador y dar seguimiento a tus citas con total comodidad.';
const DEFAULT_PROFILE_DESCRIPTION = 'Gestiona tu información personal y cuida tu bienestar en cada cita.';
const DEFAULT_HEALTH_NOTICE =
  'Por tu seguridad y bienestar, indícanos si presentas alergias (por ejemplo: a productos, monómero, acetona, látex, etc.).';
const DEFAULT_PUNCTUALITY_POLICY =
  'Si llegas más de 10 minutos atrasada a tu cita, perderás tu turno y el depósito no es reembolsable.';

function normalizeShift(raw: any, idx: number): StudioShiftRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const start = String(raw.start ?? '').trim();
  const end = String(raw.end ?? '').trim();
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
  const label = typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : `${start} - ${end}`;
  return { start, end, label, active: raw.active !== false, id: undefined } as StudioShiftRecord & { id?: string };
  void idx;
}

function normalizeWorkingDays(raw: any): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_WORKING_DAYS];
  const nums = raw
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [...DEFAULT_WORKING_DAYS];
}

function normalizeBlockedDates(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  const dates = raw
    .map((d) => String(d ?? '').trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return [...new Set(dates)].sort();
}

function normalizeBlockedSlots(raw: any): BlockedSlotRecord[] {
  if (!Array.isArray(raw)) return [];
  const slots = raw
    .filter((s) => s && typeof s === 'object')
    .map((s: any) => ({
      date: String(s.date ?? '').trim(),
      startTime: String(s.startTime ?? '').trim(),
    }))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && /^\d{2}:\d{2}$/.test(s.startTime));
  const seen = new Set<string>();
  const out: BlockedSlotRecord[] = [];
  for (const s of slots) {
    const key = `${s.date}|${s.startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
}

function normalizeStudioConfig(raw: Partial<StudioConfigRecord> | null | undefined): StudioConfigRecord {
  const base = (raw ?? {}) as any;
  const accountsInput = Array.isArray(base.accounts) ? (base.accounts as any[]) : [];
  let accounts: BankAccountRecord[] = accountsInput
    .filter((a) => a && typeof a === 'object')
    .map((a, idx) => ({
      id: typeof a.id === 'string' && a.id ? a.id : `acc-${idx + 1}`,
      bankName: String(a.bankName ?? ''),
      accountType: String(a.accountType ?? ''),
      accountNumber: String(a.accountNumber ?? ''),
      accountHolder: String(a.accountHolder ?? ''),
      idNumber: a.idNumber != null ? String(a.idNumber) : undefined,
      email: a.email != null ? String(a.email) : undefined,
      active: a.active !== false,
    }))
    .filter((a) => a.bankName || a.accountNumber || a.accountHolder);

  const legacyBankName = String(base.bankName ?? '');
  const legacyAccountHolder = String(base.accountHolder ?? '');
  const legacyAccountNumber = String(base.accountNumber ?? '');
  const legacyAccountType = String(base.accountType ?? '');
  const legacyIdNumber = String(base.idNumber ?? '');

  if (accounts.length === 0 && (legacyBankName || legacyAccountHolder || legacyAccountNumber)) {
    accounts = [
      {
        id: 'acc-1',
        bankName: legacyBankName,
        accountType: legacyAccountType,
        accountNumber: legacyAccountNumber,
        accountHolder: legacyAccountHolder,
        idNumber: legacyIdNumber || undefined,
        active: true,
      },
    ];
  }

  const primary = accounts.find((a) => a.active !== false) ?? accounts[0];
  const depositAmountNum = Number(base.depositAmount);
  const depositAmount = Number.isFinite(depositAmountNum) && depositAmountNum > 0 ? depositAmountNum : 5;

  const recipientIdNumber = String(base.recipientIdNumber ?? base.idNumber ?? primary?.idNumber ?? '');
  const recipientEmail = String(base.recipientEmail ?? primary?.email ?? '');

  const shiftsInput = Array.isArray(base.shifts) ? base.shifts : null;
  let shifts: StudioShiftRecord[] = [];
  if (shiftsInput) {
    shifts = shiftsInput
      .map((s: any, idx: number) => normalizeShift(s, idx))
      .filter((s: StudioShiftRecord | null): s is StudioShiftRecord => Boolean(s));
  }
  if (shifts.length === 0) shifts = DEFAULT_SHIFTS.map((s) => ({ ...s }));

  const brandName = String(base.brandName ?? '').trim() || DEFAULT_BRAND_NAME;
  const homeWelcomeTitle = String(base.homeWelcomeTitle ?? '').trim() || DEFAULT_HOME_WELCOME_TITLE;
  const homeWelcomeSubtitle = String(base.homeWelcomeSubtitle ?? '').trim() || DEFAULT_HOME_WELCOME_SUBTITLE;
  const profileDescription = String(base.profileDescription ?? '').trim() || DEFAULT_PROFILE_DESCRIPTION;
  const healthNotice = String(base.healthNotice ?? '').trim() || DEFAULT_HEALTH_NOTICE;
  const punctualityPolicy = String(base.punctualityPolicy ?? '').trim() || DEFAULT_PUNCTUALITY_POLICY;
  const contactInfo = String(base.contactInfo ?? '');
  const exactAddress = String(base.exactAddress ?? '');
  const arrivalReference = String(base.arrivalReference ?? '');
  const mapsUrl = String(base.mapsUrl ?? '');

  const workingDays = normalizeWorkingDays(base.workingDays);
  const blockedDates = normalizeBlockedDates(base.blockedDates);
  const blockedSlots = normalizeBlockedSlots(base.blockedSlots);

  return {
    depositAmount,
    recipientIdNumber,
    recipientEmail,
    bankName: String(primary?.bankName ?? base.bankName ?? ''),
    accountHolder: String(primary?.accountHolder ?? base.accountHolder ?? ''),
    accountNumber: String(primary?.accountNumber ?? base.accountNumber ?? ''),
    accountType: String(primary?.accountType ?? base.accountType ?? ''),
    idNumber: String(base.idNumber ?? recipientIdNumber ?? primary?.idNumber ?? ''),
    instructions: String(base.instructions ?? ''),
    accounts,
    shifts,
    workingDays,
    blockedDates,
    blockedSlots,
    brandName,
    homeWelcomeTitle,
    homeWelcomeSubtitle,
    profileDescription,
    healthNotice,
    punctualityPolicy,
    contactInfo,
    exactAddress,
    arrivalReference,
    mapsUrl,
  };
}

const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export class InMemoryStore {
  users = new Map<string, UserRecord>();
  userEmailIndex = new Map<string, string>();
  refreshTokens = new Map<string, RefreshTokenRecord>();
  refreshTokenHashIndex = new Map<string, string>();
  passwordResetTokens = new Map<string, PasswordResetTokenRecord>();
  passwordResetTokenHashIndex = new Map<string, string>();
  techSheets = new Map<string, TechSheetRecord>();

  catalogServices = new Map<string, CatalogServiceRecord>();
  catalogEffects = new Map<string, CatalogEffectRecord>();
  nailLengths = new Map<string, NailLengthRecord>();

  appointments = new Map<string, AppointmentRecord>();
  appointmentLogs = new Map<string, AppointmentLogRecord[]>();
  inventoryItems = new Map<string, InventoryItemRecord>();

  private _studioConfig: StudioConfigRecord = normalizeStudioConfig({
    depositAmount: 5,
    recipientIdNumber: '',
    recipientEmail: '',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    accountType: '',
    idNumber: '',
    instructions: '',
    accounts: [],
  });

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
    this._studioConfig = normalizeStudioConfig(v);
    this.schedulePersist();
  }
  setStudioConfig(patch: Partial<StudioConfigRecord>): void {
    this._studioConfig = normalizeStudioConfig({ ...this._studioConfig, ...patch });
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
    this.wrapMap(this.passwordResetTokens);
    this.wrapMap(this.passwordResetTokenHashIndex);
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
      passwordResetTokens: [...this.passwordResetTokens.entries()],
      passwordResetTokenHashIndex: [...this.passwordResetTokenHashIndex.entries()],
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
      this.replaceMap(this.passwordResetTokens, (data.passwordResetTokens ?? []) as [string, PasswordResetTokenRecord][]);
      this.replaceMap(this.passwordResetTokenHashIndex, (data.passwordResetTokenHashIndex ?? []) as [string, string][]);
      this.replaceMap(this.techSheets, data.techSheets as [string, TechSheetRecord][]);
      this.replaceMap(this.catalogServices, data.catalogServices as [string, CatalogServiceRecord][]);
      this.replaceMap(this.catalogEffects, data.catalogEffects as [string, CatalogEffectRecord][]);
      this.replaceMap(this.nailLengths, data.nailLengths as [string, NailLengthRecord][]);
      this.replaceMap(this.appointments, data.appointments as [string, AppointmentRecord][]);
      this.replaceMap(this.appointmentLogs, data.appointmentLogs as [string, AppointmentLogRecord[]][]);
      this.replaceMap(this.inventoryItems, data.inventoryItems as [string, InventoryItemRecord][]);
      if (data.studioConfig) this._studioConfig = normalizeStudioConfig(data.studioConfig as Partial<StudioConfigRecord>);
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
    clear(this.passwordResetTokens);
    clear(this.passwordResetTokenHashIndex);
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
    this._studioConfig = normalizeStudioConfig({
      depositAmount: 5,
      recipientIdNumber: '1234567890',
      recipientEmail: 'studio@nailstudio.com',
      bankName: 'Banco Pichincha',
      accountHolder: 'NailStudio',
      accountNumber: '1234567890',
      accountType: 'Ahorros',
      idNumber: '1234567890',
      instructions: 'Transfiere el depósito indicado y sube tu comprobante para validar tu reserva.',
      accounts: [
        {
          bankName: 'Banco Pichincha',
          accountType: 'Ahorros',
          accountNumber: '1234567890',
          accountHolder: 'NailStudio',
          idNumber: '1234567890',
          email: 'studio@nailstudio.com',
          active: true,
        },
      ],
      shifts: [
        { start: '08:00', end: '11:00', label: '08:00 - 11:00', active: true },
        { start: '11:00', end: '14:00', label: '11:00 - 14:00', active: true },
        { start: '14:00', end: '17:00', label: '14:00 - 17:00', active: true },
        { start: '17:00', end: '20:00', label: '17:00 - 20:00', active: true },
      ],
      workingDays: [1, 2, 3, 4, 5, 6],
      blockedDates: [],
      blockedSlots: [],
      brandName: 'Nb_nails',
      homeWelcomeTitle: 'Bienvenida a tu espacio',
      homeWelcomeSubtitle:
        'Desde aquí podrás explorar el catálogo, cotizar tu servicio y reservar tu cita con total comodidad.',
      profileDescription: 'Gestiona tu información personal y cuida tu bienestar en cada cita.',
      healthNotice:
        'Por tu seguridad y bienestar, indícanos si presentas alergias (por ejemplo: a productos, monómero, acetona, látex, etc.).',
      punctualityPolicy:
        'Si llegas más de 10 minutos atrasada a tu cita, perderás tu turno y el depósito no es reembolsable.',
      contactInfo: 'Calceta, Manabí · Contáctanos por redes o WhatsApp para más información.',
      exactAddress: '',
      arrivalReference: '',
      mapsUrl: '',
    });
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