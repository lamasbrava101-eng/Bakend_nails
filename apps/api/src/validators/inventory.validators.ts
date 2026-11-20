import { z } from 'zod';

const base = {
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  cost: z.number().nonnegative().optional(),
  purchasedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  criticalThreshold: z.number().nonnegative().nullable().optional(),
};

export const createInventorySchema = z.object(base).strict();
export const updateInventorySchema = z.object(base).partial().strict();

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;