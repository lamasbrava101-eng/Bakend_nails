import { z } from 'zod';
import { lengthCodeEnum } from './catalog.validators.js';

export const createAppointmentSchema = z
  .object({
    clientName: z.string().min(1),
    clientPhone: z.string().min(1),
    clientEmail: z.string().email(),
    serviceId: z.string().min(1),
    length: lengthCodeEnum,
    effectIds: z.array(z.string().min(1)).default([]),
    includeRemoval: z.boolean().default(false),
    startAt: z.string().min(1),
    voucherUrl: z.string().min(1).optional(),
    voucherData: z.string().min(1).optional(),
  })
  .strict();

export const voucherSchema = z
  .object({
    voucherUrl: z.string().min(1).optional(),
    voucherData: z.string().min(1).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.voucherUrl || d.voucherData), {
    message: 'voucherUrl or voucherData is required',
  });

export const cancelAppointmentSchema = z
  .object({
    reason: z.string().min(1).optional(),
  })
  .strict();

export const appointmentLogSchema = z
  .object({
    note: z.string().min(1),
  })
  .strict();

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type VoucherInput = z.infer<typeof voucherSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type AppointmentLogInput = z.infer<typeof appointmentLogSchema>;