import { z } from 'zod';

export const techSheetSchema = z
  .object({
    allergies: z.string().max(1000).optional().nullable(),
  })
  .strict();

export type TechSheetInput = z.infer<typeof techSheetSchema>;