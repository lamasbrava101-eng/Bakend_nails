import { z } from 'zod';

export const serviceCategoryEnum = z.enum(['ACRYLIC', 'SOFT_GEL', 'SEMI_PERMANENT', 'NAIL_ART']);
export const effectTypeEnum = z.enum(['EFFECT', 'REMOVAL']);
export const lengthCodeEnum = z.enum(['S', 'M', 'L', 'XL']);

const serviceBase = {
  name: z.string().min(1),
  category: serviceCategoryEnum,
  description: z.string().min(1).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  basePrice: z.number().nonnegative(),
  baseDurationMin: z.number().int().positive(),
  active: z.boolean().optional(),
};

export const createServiceSchema = z.object(serviceBase).strict();
export const updateServiceSchema = z.object(serviceBase).partial().strict();

const effectBase = {
  name: z.string().min(1),
  type: effectTypeEnum,
  price: z.number().nonnegative(),
  durationMin: z.number().int().nonnegative(),
  active: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional(),
};

export const createEffectSchema = z.object(effectBase).strict();
export const updateEffectSchema = z.object(effectBase).partial().strict();

const lengthBase = {
  code: lengthCodeEnum,
  label: z.string().min(1),
  priceModifier: z.number(),
  durationModifier: z.number().int(),
  active: z.boolean().optional(),
};

export const createLengthSchema = z.object(lengthBase).strict();
export const updateLengthSchema = z.object(lengthBase).partial().strict();

export const quoteSchema = z
  .object({
    serviceId: z.string().min(1),
    length: lengthCodeEnum,
    effectIds: z.array(z.string().min(1)).default([]),
    includeRemoval: z.boolean().default(false),
  })
  .strict();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateEffectInput = z.infer<typeof createEffectSchema>;
export type UpdateEffectInput = z.infer<typeof updateEffectSchema>;
export type CreateLengthInput = z.infer<typeof createLengthSchema>;
export type UpdateLengthInput = z.infer<typeof updateLengthSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;