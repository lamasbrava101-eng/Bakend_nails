import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import {
  createServiceSchema,
  updateServiceSchema,
  createEffectSchema,
  updateEffectSchema,
  createLengthSchema,
  updateLengthSchema,
  quoteSchema,
} from '../validators/catalog.validators.js';

const router = Router();

// Public reads
router.get('/services', catalogController.listServices);
router.get('/effects', catalogController.listEffects);
router.get('/lengths', catalogController.listLengths);
router.post('/quote', validate(quoteSchema), catalogController.quote);

// Services admin/gestión (web admin y app para roles autorizados)
router.post('/services', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(createServiceSchema), catalogController.createService);
router.put('/services/:id', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(updateServiceSchema), catalogController.updateService);
router.delete('/services/:id', requireAuth, requireRole('ADMIN', 'MANICURIST'), catalogController.deleteService);

// Effects admin/gestión
router.post('/effects', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(createEffectSchema), catalogController.createEffect);
router.put('/effects/:id', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(updateEffectSchema), catalogController.updateEffect);
router.delete('/effects/:id', requireAuth, requireRole('ADMIN', 'MANICURIST'), catalogController.deleteEffect);

// Lengths admin/gestión
router.post('/lengths', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(createLengthSchema), catalogController.createLength);
router.put('/lengths/:id', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(updateLengthSchema), catalogController.updateLength);
router.delete('/lengths/:id', requireAuth, requireRole('ADMIN', 'MANICURIST'), catalogController.deleteLength);

export default router;