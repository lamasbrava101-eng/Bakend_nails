import { Router } from 'express';
import { meController } from '../controllers/me.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { updateMeSchema } from '../validators/me.validators.js';

const router = Router();

router.get('/', requireAuth, meController.get);
router.put('/', requireAuth, validate(updateMeSchema), meController.update);

export default router;