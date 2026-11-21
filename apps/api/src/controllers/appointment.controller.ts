import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { appointmentService } from '../services/appointment.service.js';
import { store } from '../store/inMemoryStore.js';
import type { AppointmentRecord, AppointmentStatus } from '../types/index.js';

function isStaffRole(role: unknown): role is 'ADMIN' | 'MANICURIST' {
  return role === 'ADMIN' || role === 'MANICURIST';
}

function canRevealSalonLocation(appt: AppointmentRecord): boolean {
  // Ubicación exacta para clienta: solo con depósito validado/cita confirmada o completada
  return appt.status === 'CONFIRMED' || appt.status === 'COMPLETED';
}

function withSalonLocation<T extends AppointmentRecord>(appt: T, opts?: { forceReveal?: boolean }) {
  const reveal = opts?.forceReveal || canRevealSalonLocation(appt);
  if (!reveal) return appt;
  const { exactAddress, arrivalReference, mapsUrl } = store.studioConfig;
  return {
    ...appt,
    salonLocation: {
      exactAddress: exactAddress || '',
      arrivalReference: arrivalReference || '',
      mapsUrl: mapsUrl || '',
    },
  };
}

export const appointmentController = {
  async availability(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date;
      const durationRaw = req.query.durationMin;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError('VALIDATION_ERROR', 422, 'Invalid date');
      }
      let durationMin: number | undefined;
      if (durationRaw !== undefined) {
        const n = Number(durationRaw);
        if (!Number.isFinite(n) || n <= 0) {
          throw new AppError('VALIDATION_ERROR', 422, 'Invalid durationMin');
        }
        durationMin = n;
      }
      const data = appointmentService.availability(date, durationMin);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = await appointmentService.create(req.body);
      res.status(201).json({ data: withSalonLocation(appt) });
    } catch (e) {
      next(e);
    }
  },

  async staffList(req: Request, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? (req.query.status as AppointmentStatus) : undefined;
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const data = appointmentService.listForStaff({ status, date });
      const forceReveal = isStaffRole(req.user?.role);
      res.status(200).json({ data: data.map((a) => withSalonLocation(a, { forceReveal })) });
    } catch (e) {
      next(e);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.get(req.params.id);
      const forceReveal = isStaffRole(req.user?.role);
      res.status(200).json({ data: withSalonLocation(appt, { forceReveal }) });
    } catch (e) {
      next(e);
    }
  },

  async voucher(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = await appointmentService.uploadVoucher(req.params.id, req.body);
      res.status(200).json({ data: withSalonLocation(appt) });
    } catch (e) {
      next(e);
    }
  },

  async adminList(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const data = appointmentService.adminList({ status: status as AppointmentStatus | undefined, from, to });
      const forceReveal = isStaffRole(req.user?.role);
      res.status(200).json({ data: data.map((a) => withSalonLocation(a, { forceReveal })) });
    } catch (e) {
      next(e);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.approve(req.params.id);
      res.status(200).json({ data: withSalonLocation(appt) });
    } catch (e) {
      next(e);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.reject(req.params.id);
      res.status(200).json({ data: withSalonLocation(appt) });
    } catch (e) {
      next(e);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = isStaffRole(req.user?.role) && req.user?.id
        ? { userId: req.user.id, role: req.user.role as 'ADMIN' | 'MANICURIST' }
        : undefined;
      const appt = appointmentService.complete(req.params.id, req.body ?? {}, actor);
      const forceReveal = isStaffRole(req.user?.role);
      res.status(200).json({ data: withSalonLocation(appt, { forceReveal }) });
    } catch (e) {
      next(e);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.cancel(req.params.id, req.body?.reason);
      const forceReveal = isStaffRole(req.user?.role);
      res.status(200).json({ data: withSalonLocation(appt, { forceReveal }) });
    } catch (e) {
      next(e);
    }
  },

  async myList(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
      const data = await appointmentService.listForClient(userId);
      // Sanitiza salonLocation para clienta según estado (solo CONFIRMED/COMPLETED)
      res.status(200).json({ data: data.map((a) => withSalonLocation(a)) });
    } catch (e) {
      next(e);
    }
  },

  async myCancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
      const appt = await appointmentService.cancelForClient(userId, req.params.id, req.body?.reason);
      res.status(200).json({ data: withSalonLocation(appt) });
    } catch (e) {
      next(e);
    }
  },

  async addLog(req: Request, res: Response, next: NextFunction) {
    try {
      const log = appointmentService.addLog(req.params.id, req.body.note);
      res.status(201).json({ data: log });
    } catch (e) {
      next(e);
    }
  },

  async logs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = appointmentService.logs(req.params.id);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },
};