import { z } from 'zod';

export const techSheetSchema = z
  .object({
    allergies: z.string().optional().nullable(),
    nailType: z.string().optional().nullable(),
    preferredTones: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
  })
  .strict();

export type TechSheetInput = z.infer<typeof techSheetSchema>;