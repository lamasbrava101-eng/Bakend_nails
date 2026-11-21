import { z } from 'zod';

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm');

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

const shiftSchema = z
  .object({
    start: hhmm,
    end: hhmm,
    label: z.string().optional(),
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
    // turnos fijos configurables
    shifts: z.array(shiftSchema).optional(),
    // textos/mensajes personalizables
    brandName: z.string().optional(),
    homeWelcomeTitle: z.string().optional(),
    homeWelcomeSubtitle: z.string().optional(),
    profileDescription: z.string().optional(),
    healthNotice: z.string().optional(),
    punctualityPolicy: z.string().optional(),
    contactInfo: z.string().optional(),
    // ubicación privada del salón (solo gestión/staff y tras depósito validado en cita)
    exactAddress: z.string().optional(),
    arrivalReference: z.string().optional(),
    mapsUrl: z.string().url().optional().or(z.literal('')),
  })
  .strict();

export type StudioConfigInput = z.infer<typeof studioConfigSchema>;