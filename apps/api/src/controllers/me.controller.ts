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
      const user = req.user!;
      const isOwner = user.id === clientId;
      const isStaff = user.role === 'ADMIN' || user.role === 'MANICURIST';
      if (!isOwner && !isStaff) {
        throw new AppError('FORBIDDEN', 403, 'No tienes permiso para consultar esta información.');
      }
      const sheet = await techSheetsRepo.findByClient(clientId);
      if (!sheet) {
        throw new AppError('NOT_FOUND', 404, 'Tech sheet not found');
      }
      // Perfil de clienta simplificado: solo alergias
      res.status(200).json({
        data: {
          id: sheet.id,
          clientId: sheet.clientId,
          allergies: sheet.allergies ?? null,
          updatedAt: sheet.updatedAt,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.params.id;
      const user = req.user!;
      const isOwner = user.id === clientId;
      const isStaff = user.role === 'ADMIN' || user.role === 'MANICURIST';
      // La clienta solo puede editar su propia información/alergias; staff puede gestionar fichas
      if (!isOwner && !isStaff) {
        throw new AppError('FORBIDDEN', 403, 'No tienes permiso para modificar esta información.');
      }
      if (user.role === 'CLIENT' && !isOwner) {
        throw new AppError('FORBIDDEN', 403, 'No tienes permiso para modificar esta información.');
      }
      const body = req.body as Record<string, unknown>;
      const allergies = body.allergies === undefined ? undefined : (body.allergies as string | null);
      const sheet = await techSheetsRepo.upsert(clientId, {
        allergies,
        nailType: null,
        preferredTones: null,
        photoUrl: null,
      });
      res.status(200).json({
        data: {
          id: sheet.id,
          clientId: sheet.clientId,
          allergies: sheet.allergies ?? null,
          updatedAt: sheet.updatedAt,
        },
      });
    } catch (e) {
      next(e);
    }
  },
};