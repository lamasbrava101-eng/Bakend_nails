import type { Request, Response, NextFunction } from 'express';
import { usersRepo } from '../repositories/users.repo.js';
import { techSheetsRepo } from '../repositories/techSheets.repo.js';

export const adminClientsController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await usersRepo.listClients();
      const data = await Promise.all(
        clients.map(async (u) => {
          const sheet = await techSheetsRepo.findByClient(u.id);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            allergies: sheet?.allergies ?? null,
          };
        }),
      );
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },
};
