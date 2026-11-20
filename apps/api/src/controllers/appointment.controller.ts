import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { appointmentService } from '../services/appointment.service.js';
import type { AppointmentStatus } from '../types/index.js';

export const appointmentController = {
  async availability(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date;
      const durationRaw = req.query.durationMin;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError('VALIDATION_ERROR', 422, 'Invalid date');
      }
      const durationMin = Number(durationRaw);
      if (!Number.isFinite(durationMin) || durationMin <= 0) {
        throw new AppError('VALIDATION_ERROR', 422, 'Invalid durationMin');
      }
      const data = appointmentService.availability(date, durationMin);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.create(req.body);
      res.status(201).json({ data: appt });
    } catch (e) {
      next(e);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.get(req.params.id);
      res.status(200).json({ data: appt });
    } catch (e) {
      next(e);
    }
  },

  async voucher(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.uploadVoucher(req.params.id, req.body);
      res.status(200).json({ data: appt });
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
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.approve(req.params.id);
      res.status(200).json({ data: appt });
    } catch (e) {
      next(e);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.reject(req.params.id);
      res.status(200).json({ data: appt });
    } catch (e) {
      next(e);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.complete(req.params.id);
      res.status(200).json({ data: appt });
    } catch (e) {
      next(e);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const appt = appointmentService.cancel(req.params.id, req.body?.reason);
      res.status(200).json({ data: appt });
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