import { z } from 'zod';

const base = {
  bankName: z.string().min(1),
  accountHolder: z.string().min(1),
  accountNumber: z.string().min(1),
  accountType: z.string().min(1),
  idNumber: z.string().min(1),
  instructions: z.string().min(1),
};

export const studioConfigSchema = z.object(base).partial().strict();
export type StudioConfigInput = z.infer<typeof studioConfigSchema>;