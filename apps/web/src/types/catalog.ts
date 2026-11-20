export type ServiceCategory = 'ACRYLIC' | 'SOFT_GEL' | 'SEMI_PERMANENT' | 'NAIL_ART';

export interface CatalogService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  baseDurationMin: number;
  removalPrice?: number;
  removalDurationMin?: number;
  active: boolean;
}

export type EffectType = 'EFFECT' | 'REMOVAL';

export interface CatalogEffect {
  id: string;
  name: string;
  type: EffectType;
  price: number;
  durationMin: number;
  active: boolean;
  imageUrl: string | null;
}

export interface NailLength {
  id: string;
  code: 'S' | 'M' | 'L' | 'XL';
  label: string;
  priceModifier: number;
  durationModifier: number;
  active: boolean;
}

export interface QuoteBreakdown {
  base: number;
  length: number;
  effects: number;
  removal: number;
}

export interface QuoteResult {
  priceTotal: number;
  durationMin: number;
  breakdown: QuoteBreakdown;
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  ACRYLIC: 'Acrílicas',
  SOFT_GEL: 'Soft Gel',
  SEMI_PERMANENT: 'Semi-permanente',
  NAIL_ART: 'Nail Art',
};

export const LENGTH_LABELS: Record<string, string> = {
  S: 'Corto (S)',
  M: 'Mediano (M)',
  L: 'Largo (L)',
  XL: 'Extra Largo (XL)',
};