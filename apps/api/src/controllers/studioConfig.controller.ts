import type { Request, Response, NextFunction } from 'express';
import { store } from '../store/inMemoryStore.js';
import type { StudioConfigRecord } from '../types/index.js';

function toPublicStudioConfig(config: StudioConfigRecord) {
  // Seguridad: no exponer ubicación exacta ni enlace de Maps en respuestas públicas
  const { exactAddress: _exactAddress, arrivalReference: _arrivalReference, mapsUrl: _mapsUrl, ...publicConfig } = config;
  return publicConfig;
}

function canViewPrivateConfig(req: Request): boolean {
  const role = req.user?.role;
  return role === 'ADMIN' || role === 'MANICURIST';
}

export const studioConfigController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const config = store.studioConfig;
      const data = canViewPrivateConfig(req) ? config : toPublicStudioConfig(config);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = req.body ?? {};
      store.studioConfig = { ...store.studioConfig, ...patch };
      // Respuesta completa para gestión autorizada (ADMIN/MANICURIST)
      res.status(200).json({ data: store.studioConfig });
    } catch (e) {
      next(e);
    }
  },
};