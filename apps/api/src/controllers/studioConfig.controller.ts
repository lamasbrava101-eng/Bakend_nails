import type { Request, Response, NextFunction } from 'express';
import { store } from '../store/inMemoryStore.js';

export const studioConfigController = {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ data: store.studioConfig });
    } catch (e) {
      next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = req.body ?? {};
      store.studioConfig = { ...store.studioConfig, ...patch };
      res.status(200).json({ data: store.studioConfig });
    } catch (e) {
      next(e);
    }
  },
};