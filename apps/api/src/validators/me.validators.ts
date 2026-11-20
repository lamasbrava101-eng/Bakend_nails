import { z } from 'zod';

export const updateMeSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
  })
  .strict();

export type UpdateMeInput = z.infer<typeof updateMeSchema>;