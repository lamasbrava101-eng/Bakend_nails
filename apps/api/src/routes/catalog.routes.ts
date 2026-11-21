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

// Services admin (solo ADMIN)
router.post('/services', requireAuth, requireRole('ADMIN'), validate(createServiceSchema), catalogController.createService);
router.put('/services/:id', requireAuth, requireRole('ADMIN'), validate(updateServiceSchema), catalogController.updateService);
router.delete('/services/:id', requireAuth, requireRole('ADMIN'), catalogController.deleteService);

// Effects admin (solo ADMIN)
router.post('/effects', requireAuth, requireRole('ADMIN'), validate(createEffectSchema), catalogController.createEffect);
router.put('/effects/:id', requireAuth, requireRole('ADMIN'), validate(updateEffectSchema), catalogController.updateEffect);
router.delete('/effects/:id', requireAuth, requireRole('ADMIN'), catalogController.deleteEffect);

// Lengths admin (solo ADMIN)
router.post('/lengths', requireAuth, requireRole('ADMIN'), validate(createLengthSchema), catalogController.createLength);
router.put('/lengths/:id', requireAuth, requireRole('ADMIN'), validate(updateLengthSchema), catalogController.updateLength);
router.delete('/lengths/:id', requireAuth, requireRole('ADMIN'), catalogController.deleteLength);

export default router;