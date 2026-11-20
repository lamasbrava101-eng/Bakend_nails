import { AppError } from '../utils/errors.js';
import { store } from '../store/inMemoryStore.js';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { catalogRepo } from '../repositories/catalog.repo.js';
import { catalogService } from './catalog.service.js';
import { withinWorkingHours } from '../utils/time.js';
import type {
  AppointmentRecord,
  AppointmentStatus,
} from '../types/index.js';
import type { CreateAppointmentInput } from '../validators/appointment.validators.js';

const ACTIVE_STATUSES: AppointmentStatus[] = ['PENDING_PAYMENT', 'CONFIRMED'];

export function expirePendingAppointments(): void {
  const now = Date.now();
  const cutoff = 15 * 60 * 1000;
  for (const appt of store.appointments.values()) {
    if (appt.deletedAt) continue;
    if (appt.status !== 'PENDING_PAYMENT') continue;
    if (appt.voucherUploadedAt) continue;
    const created = new Date(appt.createdAt).getTime();
    if (now - created > cutoff) {
      appt.status = 'EXPIRED';
      store.appointments.set(appt.id, appt);
    }
  }
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export const appointmentService = {
  availability(date: string, durationMin: number): string[] {
    expirePendingAppointments();
    const slots: string[] = [];
    const dayStart = new Date(`${date}T00:00:00.000Z`); // not used directly
    void dayStart;

    const WORK_START = 9 * 60;
    const WORK_END = 18 * 60;
    const step = 15;
    const active = [...store.appointments.values()].filter(
      (a) => !a.deletedAt && ACTIVE_STATUSES.includes(a.status),
    );

    for (let min = WORK_START; min + durationMin <= WORK_END; min += step) {
      const start = slotDate(date, min);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      if (!withinWorkingHours(start, end)) continue;
      const conflicts = active.some((a) => {
        const aStart = new Date(a.startAt);
        const aEnd = new Date(a.endAt);
        return overlap(start, end, aStart, aEnd);
      });
      if (!conflicts) slots.push(start.toISOString());
    }
    return slots;
  },

  create(input: CreateAppointmentInput): AppointmentRecord {
    expirePendingAppointments();

    const service = catalogRepo.findService(input.serviceId);
    if (!service || !service.active) {
      throw new AppError('NOT_FOUND', 404, 'Service not found');
    }

    const quote = catalogService.quote({
      serviceId: input.serviceId,
      length: input.length,
      effectIds: input.effectIds ?? [],
      includeRemoval: input.includeRemoval ?? false,
    });

    const start = new Date(input.startAt);
    if (isNaN(start.getTime())) {
      throw new AppError('VALIDATION_ERROR', 422, 'Invalid startAt');
    }
    const end = new Date(start.getTime() + quote.durationMin * 60 * 1000);
    if (!withinWorkingHours(start, end)) {
      throw new AppError('VALIDATION_ERROR', 422, 'Appointment outside working hours');
    }

    const active = [...store.appointments.values()].filter(
      (a) => !a.deletedAt && ACTIVE_STATUSES.includes(a.status),
    );
    for (const a of active) {
      const aStart = new Date(a.startAt);
      const aEnd = new Date(a.endAt);
      if (overlap(start, end, aStart, aEnd)) {
        throw new AppError('APPOINTMENT_OVERLAP', 409, 'Appointment overlaps an existing booking');
      }
    }

    const rec: AppointmentRecord = {
      id: store.newId(),
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      serviceId: input.serviceId,
      serviceName: service.name,
      length: input.length,
      effectIds: input.effectIds ?? [],
      includeRemoval: input.includeRemoval ?? false,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      durationMin: quote.durationMin,
      priceTotal: quote.priceTotal,
      status: 'PENDING_PAYMENT',
      voucherUrl: null,
      voucherUploadedAt: null,
      remindedAt: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    appointmentRepo.create(rec);
    return rec;
  },

  get(id: string): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    return appt;
  },

  uploadVoucher(id: string, body: { voucherUrl?: string; voucherData?: string }): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status === 'EXPIRED') {
      throw new AppError('APPOINTMENT_EXPIRED', 409, 'Appointment expired');
    }
    if (appt.status === 'COMPLETED' || appt.status === 'CANCELLED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const url = body.voucherUrl ?? body.voucherData ?? null;
    if (!url) throw new AppError('VALIDATION_ERROR', 422, 'voucherUrl or voucherData required');
    const updated = appointmentRepo.update(id, {
      voucherUrl: url,
      voucherUploadedAt: new Date().toISOString(),
    });
    if (!updated) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    return updated;
  },

  adminList(filter?: { status?: AppointmentStatus; from?: string; to?: string }): AppointmentRecord[] {
    expirePendingAppointments();
    return appointmentRepo.list(filter);
  },

  approve(id: string): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status !== 'PENDING_PAYMENT') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const updated = appointmentRepo.update(id, { status: 'CONFIRMED' });
    if (!updated) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    return updated;
  },

  reject(id: string): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status !== 'PENDING_PAYMENT') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const updated = appointmentRepo.update(id, { status: 'CANCELLED' });
    if (!updated) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    return updated;
  },

  complete(id: string): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status !== 'CONFIRMED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const updated = appointmentRepo.update(id, { status: 'COMPLETED' });
    if (!updated) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    return updated;
  },

  cancel(id: string, reason?: string): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status !== 'PENDING_PAYMENT' && appt.status !== 'CONFIRMED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const updated = appointmentRepo.update(id, { status: 'CANCELLED' });
    if (!updated) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (reason) {
      appointmentRepo.addLog({
        id: store.newId(),
        appointmentId: id,
        note: `Cancelled: ${reason}`,
        createdAt: new Date().toISOString(),
      });
    }
    return updated;
  },

  addLog(id: string, note: string): ReturnType<typeof appointmentRepo.addLog> {
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    const log = {
      id: store.newId(),
      appointmentId: id,
      note,
      createdAt: new Date().toISOString(),
    };
    return appointmentRepo.addLog(log);
  },

  logs(id: string): ReturnType<typeof appointmentRepo.logs> {
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    return appointmentRepo.logs(id);
  },
};

function slotDate(dateStr: string, minutesFromMidnight: number): Date {
  const totalMinutes = minutesFromMidnight + 5 * 60;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const hh = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mm = totalMinutes % 60;
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  base.setUTCHours(hh, mm, 0, 0);
  return base;
}