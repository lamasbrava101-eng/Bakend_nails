import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { inventoryController } from '../controllers/inventory.controller.js';
import { createInventorySchema, updateInventorySchema } from '../validators/inventory.validators.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', inventoryController.list);
router.post('/', validate(createInventorySchema), inventoryController.create);
router.put('/:id', validate(updateInventorySchema), inventoryController.update);
router.delete('/:id', inventoryController.delete);

export default router;