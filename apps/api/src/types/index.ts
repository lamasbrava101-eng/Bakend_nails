export type Role = 'CLIENT' | 'MANICURIST' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface TechSheetRecord {
  id: string;
  clientId: string;
  allergies: string | null;
  nailType: string | null;
  preferredTones: string | null;
  photoUrl: string | null;
  updatedAt: string;
}

export type ServiceCategory = 'ACRYLIC' | 'SOFT_GEL' | 'SEMI_PERMANENT' | 'NAIL_ART';
export type EffectType = 'EFFECT' | 'REMOVAL';

export interface CatalogServiceRecord {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  baseDurationMin: number;
  removalPrice: number;
  removalDurationMin: number;
  active: boolean;
}

export interface CatalogEffectRecord {
  id: string;
  name: string;
  type: EffectType;
  price: number;
  durationMin: number;
  active: boolean;
  imageUrl: string | null;
}

export interface NailLengthRecord {
  id: string;
  code: 'S' | 'M' | 'L' | 'XL';
  label: string;
  priceModifier: number;
  durationModifier: number;
  active: boolean;
}

export type AppointmentStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AppointmentRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  length: 'S' | 'M' | 'L' | 'XL';
  effectIds: string[];
  includeRemoval: boolean;
  startAt: string;
  endAt: string;
  durationMin: number;
  priceTotal: number;
  status: AppointmentStatus;
  voucherUrl: string | null;
  voucherUploadedAt: string | null;
  remindedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface AppointmentLogRecord {
  id: string;
  appointmentId: string;
  note: string;
  createdAt: string;
}

export interface InventoryItemRecord {
  id: string;
  name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  cost: number;
  purchasedAt: string | null;
  notes: string | null;
  criticalThreshold: number | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface BankAccountRecord {
  id?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  idNumber?: string;
  email?: string;
  active?: boolean;
}

export interface StudioConfigRecord {
  depositAmount: number;
  recipientIdNumber: string;
  recipientEmail: string;
  // legacy/compat fields (can mirror primary account)
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  idNumber: string;
  instructions: string;
  accounts: BankAccountRecord[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}