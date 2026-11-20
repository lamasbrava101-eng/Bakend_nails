import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { catalogRepo } from '../repositories/catalog.repo.js';
import { catalogService } from '../services/catalog.service.js';
import {
  serviceCategoryEnum,
  effectTypeEnum,
  createServiceSchema,
  updateServiceSchema,
  createEffectSchema,
  updateEffectSchema,
  createLengthSchema,
  updateLengthSchema,
} from '../validators/catalog.validators.js';

export const catalogController = {
  // Public reads
  async listServices(req: Request, res: Response, next: NextFunction) {
    try {
      let category: ReturnType<typeof serviceCategoryEnum.parse> | undefined;
      if (req.query.category !== undefined) {
        const parsed = serviceCategoryEnum.safeParse(req.query.category);
        if (!parsed.success) {
          throw new AppError('VALIDATION_ERROR', 422, 'Invalid category', parsed.error.issues);
        }
        category = parsed.data;
      }
      const services = catalogRepo.listServices(category);
      res.status(200).json({ data: services });
    } catch (e) {
      next(e);
    }
  },

  async listEffects(req: Request, res: Response, next: NextFunction) {
    try {
      let type: ReturnType<typeof effectTypeEnum.parse> | undefined;
      if (req.query.type !== undefined) {
        const parsed = effectTypeEnum.safeParse(req.query.type);
        if (!parsed.success) {
          throw new AppError('VALIDATION_ERROR', 422, 'Invalid type', parsed.error.issues);
        }
        type = parsed.data;
      }
      const effects = catalogRepo.listEffects(type);
      res.status(200).json({ data: effects });
    } catch (e) {
      next(e);
    }
  },

  async listLengths(_req: Request, res: Response, next: NextFunction) {
    try {
      const lengths = catalogRepo.listLengths();
      res.status(200).json({ data: lengths });
    } catch (e) {
      next(e);
    }
  },

  async quote(req: Request, res: Response, next: NextFunction) {
    try {
      const result = catalogService.quote(req.body);
      res.status(200).json({ data: result });
    } catch (e) {
      next(e);
    }
  },

  // Services admin writes
  async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createServiceSchema.parse(req.body);
      const created = catalogRepo.createService(input);
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  },
  async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const patch = updateServiceSchema.parse(req.body);
      const updated = catalogRepo.updateService(id, patch);
      if (!updated) throw new AppError('NOT_FOUND', 404, 'Service not found');
      res.status(200).json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
  async deleteService(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = catalogRepo.deleteService(req.params.id);
      if (!ok) throw new AppError('NOT_FOUND', 404, 'Service not found');
      res.status(200).json({ data: null });
    } catch (e) {
      next(e);
    }
  },

  // Effects admin writes
  async createEffect(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createEffectSchema.parse(req.body);
      const created = catalogRepo.createEffect(input);
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  },
  async updateEffect(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = updateEffectSchema.parse(req.body);
      const updated = catalogRepo.updateEffect(req.params.id, patch);
      if (!updated) throw new AppError('NOT_FOUND', 404, 'Effect not found');
      res.status(200).json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
  async deleteEffect(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = catalogRepo.deleteEffect(req.params.id);
      if (!ok) throw new AppError('NOT_FOUND', 404, 'Effect not found');
      res.status(200).json({ data: null });
    } catch (e) {
      next(e);
    }
  },

  // Lengths admin writes
  async createLength(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createLengthSchema.parse(req.body);
      const created = catalogRepo.createLength(input);
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  },
  async updateLength(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = updateLengthSchema.parse(req.body);
      const updated = catalogRepo.updateLength(req.params.id, patch);
      if (!updated) throw new AppError('NOT_FOUND', 404, 'Length not found');
      res.status(200).json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
  async deleteLength(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = catalogRepo.deleteLength(req.params.id);
      if (!ok) throw new AppError('NOT_FOUND', 404, 'Length not found');
      res.status(200).json({ data: null });
    } catch (e) {
      next(e);
    }
  },
};

