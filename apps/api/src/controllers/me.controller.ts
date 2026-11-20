import type { Request, Response, NextFunction } from 'express';
import { usersRepo } from '../repositories/users.repo.js';
import { techSheetsRepo } from '../repositories/techSheets.repo.js';
import { AppError } from '../utils/errors.js';

function toPublicUser(user: NonNullable<Awaited<ReturnType<typeof usersRepo.findById>>>) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  };
}

export const meController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersRepo.findById(req.user!.id);
      if (!user || user.deletedAt) {
        throw new AppError('NOT_FOUND', 404, 'User not found');
      }
      res.status(200).json({ data: toPublicUser(user) });
    } catch (e) {
      next(e);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersRepo.update(req.user!.id, req.body);
      if (!user) {
        throw new AppError('NOT_FOUND', 404, 'User not found');
      }
      res.status(200).json({ data: toPublicUser(user) });
    } catch (e) {
      next(e);
    }
  },
};

export const techSheetController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id;
      if (req.user!.id !== clientId && req.user!.role !== 'ADMIN') {
        throw new AppError('NOT_FOUND', 404, 'Resource not found');
      }
      const sheet = await techSheetsRepo.findByClient(clientId);
      if (!sheet) {
        throw new AppError('NOT_FOUND', 404, 'Tech sheet not found');
      }
      res.status(200).json({ data: sheet });
    } catch (e) {
      next(e);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id;
      if (req.user!.id !== clientId && req.user!.role !== 'ADMIN') {
        throw new AppError('NOT_FOUND', 404, 'Resource not found');
      }
      const body = req.body as Record<string, unknown>;
      const preferredTones =
        Array.isArray(body.preferredTones) ? body.preferredTones.join(', ') : (body.preferredTones as string | null | undefined);
      const sheet = await techSheetsRepo.upsert(clientId, {
        allergies: body.allergies as string | null | undefined,
        nailType: body.nailType as string | null | undefined,
        preferredTones,
        photoUrl: body.photoUrl as string | null | undefined,
      });
      res.status(200).json({ data: sheet });
    } catch (e) {
      next(e);
    }
  },
};