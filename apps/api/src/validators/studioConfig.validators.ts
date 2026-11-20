import { z } from 'zod';

const bankAccountSchema = z
  .object({
    id: z.string().min(1).optional(),
    bankName: z.string().min(1),
    accountType: z.string().min(1),
    accountNumber: z.string().min(1),
    accountHolder: z.string().min(1),
    idNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    active: z.boolean().optional(),
  })
  .strict();

export const studioConfigSchema = z
  .object({
    depositAmount: z.coerce.number().positive().optional(),
    recipientIdNumber: z.string().optional(),
    recipientEmail: z.string().email().optional().or(z.literal('')),
    // legacy/compat fields
    bankName: z.string().optional(),
    accountHolder: z.string().optional(),
    accountNumber: z.string().optional(),
    accountType: z.string().optional(),
    idNumber: z.string().optional(),
    instructions: z.string().optional(),
    accounts: z.array(bankAccountSchema).optional(),
  })
  .strict();

export type StudioConfigInput = z.infer<typeof studioConfigSchema>;