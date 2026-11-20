import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { inventoryRepo } from '../repositories/inventory.repo.js';
import { store } from '../store/inMemoryStore.js';

export const inventoryController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ data: inventoryRepo.list() });
    } catch (e) {
      next(e);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body;
      const rec = {
        id: store.newId(),
        name: input.name,
        brand: input.brand ?? null,
        quantity: input.quantity,
        unit: input.unit,
        cost: input.cost ?? 0,
        purchasedAt: input.purchasedAt ?? null,
        notes: input.notes ?? null,
        criticalThreshold: input.criticalThreshold ?? null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      const created = inventoryRepo.create(rec);
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = { ...req.body } as Partial<import('../types/index.js').InventoryItemRecord>;
      const updated = inventoryRepo.update(req.params.id, patch);
      if (!updated) throw new AppError('NOT_FOUND', 404, 'Inventory item not found');
      res.status(200).json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = inventoryRepo.delete(req.params.id);
      if (!ok) throw new AppError('NOT_FOUND', 404, 'Inventory item not found');
      res.status(200).json({ data: null });
    } catch (e) {
      next(e);
    }
  },
};