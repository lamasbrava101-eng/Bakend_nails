import { AppError } from '../utils/errors.js';
import { store } from '../store/inMemoryStore.js';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { catalogRepo } from '../repositories/catalog.repo.js';
import { catalogService } from './catalog.service.js';
import { localTimeToUtc, toStudyDate } from '../utils/time.js';
import { validateVoucherImage } from '../utils/voucherOcr.js';
import type {
  AppointmentRecord,
  AppointmentStatus,
  StudioShiftRecord,
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

function getActiveShifts(): StudioShiftRecord[] {
  const shifts = Array.isArray(store.studioConfig.shifts) ? store.studioConfig.shifts : [];
  const active = shifts.filter((s) => s && s.active !== false && /^\d{2}:\d{2}$/.test(s.start) && /^\d{2}:\d{2}$/.test(s.end));
  return active.length > 0
    ? active
    : [
        { start: '08:00', end: '11:00', label: '08:00 - 11:00', active: true },
        { start: '11:00', end: '14:00', label: '11:00 - 14:00', active: true },
        { start: '14:00', end: '17:00', label: '14:00 - 17:00', active: true },
        { start: '17:00', end: '20:00', label: '17:00 - 20:00', active: true },
      ];
}

function shiftWindow(date: string, shift: StudioShiftRecord): { start: Date; end: Date } | null {
  const start = localTimeToUtc(date, shift.start);
  const end = localTimeToUtc(date, shift.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
}

export interface AvailabilityBlock {
  start: string; // HH:mm local
  end: string;   // HH:mm local
  label: string;
  startAt: string; // ISO UTC
  endAt: string;   // ISO UTC
  available: boolean;
}

export interface AvailabilityResponse {
  dayBlocked: boolean;
  message?: string;
  blocks: AvailabilityBlock[];
}

function weekdayOfDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0..6
}

function isDateBlocked(date: string): boolean {
  const cfg = store.studioConfig;
  const workingDays = Array.isArray(cfg.workingDays) && cfg.workingDays.length > 0 ? cfg.workingDays : [1, 2, 3, 4, 5, 6];
  const weekday = weekdayOfDate(date);
  if (!workingDays.includes(weekday)) return true;
  const blockedDates = Array.isArray(cfg.blockedDates) ? cfg.blockedDates : [];
  if (blockedDates.includes(date)) return true;
  return false;
}

function isSlotBlocked(date: string, startTime: string): boolean {
  const blockedSlots = Array.isArray(store.studioConfig.blockedSlots) ? store.studioConfig.blockedSlots : [];
  return blockedSlots.some((s) => s.date === date && s.startTime === startTime);
}

export const appointmentService = {
  availability(date: string, _durationMin?: number): AvailabilityResponse {
    expirePendingAppointments();
    const shifts = getActiveShifts();

    if (isDateBlocked(date)) {
      const blocks: AvailabilityBlock[] = shifts.map((shift) => {
        const win = shiftWindow(date, shift);
        const label = shift.label?.trim() || `${shift.start} - ${shift.end}`;
        return {
          start: shift.start,
          end: shift.end,
          label,
          startAt: win ? win.start.toISOString() : '',
          endAt: win ? win.end.toISOString() : '',
          available: false,
        };
      });
      return {
        dayBlocked: true,
        message: 'No hay atención disponible en esta fecha',
        blocks,
      };
    }

    const activeAppointments = [...store.appointments.values()].filter(
      (a) => !a.deletedAt && ACTIVE_STATUSES.includes(a.status),
    );

    const blocks = shifts.map((shift) => {
      const win = shiftWindow(date, shift);
      const label = shift.label?.trim() || `${shift.start} - ${shift.end}`;
      if (!win) {
        return {
          start: shift.start,
          end: shift.end,
          label,
          startAt: '',
          endAt: '',
          available: false,
        };
      }
      const conflicts = activeAppointments.some((a) => {
        const aStart = new Date(a.startAt);
        const aEnd = new Date(a.endAt);
        return overlap(win.start, win.end, aStart, aEnd);
      });
      const slotBlocked = isSlotBlocked(date, shift.start);
      return {
        start: shift.start,
        end: shift.end,
        label,
        startAt: win.start.toISOString(),
        endAt: win.end.toISOString(),
        available: !conflicts && !slotBlocked,
      };
    });

    return { dayBlocked: false, blocks };
  },

  async create(input: CreateAppointmentInput): Promise<AppointmentRecord> {
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

    // Turnos fijos: la cita debe coincidir con un bloque configurado para ese día y reservar el bloque completo
    const dateStr = toStudyDate(start);
    const shifts = getActiveShifts();
    if (isDateBlocked(dateStr)) {
      throw new AppError('VALIDATION_ERROR', 422, 'No hay atención disponible en esta fecha. Por favor selecciona otra fecha.');
    }

    const matchedShift = shifts
      .map((shift) => ({ shift, win: shiftWindow(dateStr, shift) }))
      .find(({ win }) => win && win.start.getTime() === start.getTime());
    if (!matchedShift || !matchedShift.win) {
      throw new AppError('VALIDATION_ERROR', 422, 'El horario seleccionado no corresponde a un turno disponible.');
    }
    if (isSlotBlocked(dateStr, matchedShift.shift.start)) {
      throw new AppError('VALIDATION_ERROR', 422, 'El turno seleccionado no está disponible. Por favor elige otro horario.');
    }
    const end = matchedShift.win.end;

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

    const voucherInput = (input.voucherData ?? input.voucherUrl ?? '').trim();
    let voucherUrl: string | null = null;
    let voucherUploadedAt: string | null = null;
    if (voucherInput) {
      const ocr = await validateVoucherImage(voucherInput, store.studioConfig);
      if (!ocr.ok) {
        throw new AppError('VALIDATION_ERROR', 400, ocr.message);
      }
      voucherUrl = voucherInput;
      voucherUploadedAt = new Date().toISOString();
    }

    const rec: AppointmentRecord = {
      id: store.newId(),
      clientId: (input as any).clientId ?? null,
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
      voucherUrl,
      voucherUploadedAt,
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

  async uploadVoucher(id: string, body: { voucherUrl?: string; voucherData?: string }): Promise<AppointmentRecord> {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status === 'EXPIRED') {
      throw new AppError('APPOINTMENT_EXPIRED', 409, 'Appointment expired');
    }
    if (appt.status === 'COMPLETED' || appt.status === 'CANCELLED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const url = (body.voucherUrl ?? body.voucherData ?? '').trim();
    if (!url) throw new AppError('VALIDATION_ERROR', 422, 'voucherUrl or voucherData required');

    const ocr = await validateVoucherImage(url, store.studioConfig);
    if (!ocr.ok) {
      throw new AppError('VALIDATION_ERROR', 400, ocr.message);
    }

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

  listForStaff(filter?: { status?: AppointmentStatus; date?: string }): AppointmentRecord[] {
    expirePendingAppointments();
    const items = appointmentRepo.list({ status: filter?.status });
    if (filter?.date && /^\d{4}-\d{2}-\d{2}$/.test(filter.date)) {
      return items
        .filter((a) => toStudyDate(new Date(a.startAt)) === filter.date)
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return items.sort((a, b) => a.startAt.localeCompare(b.startAt));
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

  complete(
    id: string,
    payload?: { workNotes?: string; attendedShift?: string; attendedAt?: string },
    actor?: { userId: string; role: 'ADMIN' | 'MANICURIST' },
  ): AppointmentRecord {
    expirePendingAppointments();
    const appt = appointmentRepo.find(id);
    if (!appt) throw new AppError('NOT_FOUND', 404, 'Appointment not found');
    if (appt.status === 'CANCELLED' || appt.status === 'EXPIRED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    if (appt.status !== 'CONFIRMED') {
      throw new AppError('INVALID_STATUS_TRANSITION', 409, 'Invalid status transition');
    }
    const workNotes = payload?.workNotes?.trim() || null;
    const attendedShift = payload?.attendedShift?.trim() || null;
    const attendedAt = payload?.attendedAt?.trim() || new Date().toISOString();
    const updated = appointmentRepo.update(id, {
      status: 'COMPLETED',
      workNotes,
      attendedShift,
      attendedAt,
      completedByUserId: actor?.userId ?? null,
      completedByRole: actor?.role ?? null,
    });
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

// slotDate eliminado: la disponibilidad ahora usa turnos fijos configurados en studio-config.