import { Router } from 'express';
import { techSheetController } from '../controllers/me.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { techSheetSchema } from '../validators/techSheet.validators.js';

const router = Router();

router.get('/:id/tech-sheet', requireAuth, techSheetController.get);
router.put('/:id/tech-sheet', requireAuth, validate(techSheetSchema), techSheetController.update);

export default router;