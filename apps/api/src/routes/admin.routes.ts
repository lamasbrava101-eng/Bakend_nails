import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { appointmentController } from '../controllers/appointment.controller.js';
import { inventoryController } from '../controllers/inventory.controller.js';
import { studioConfigController } from '../controllers/studioConfig.controller.js';
import { cancelAppointmentSchema, appointmentLogSchema } from '../validators/appointment.validators.js';
import { studioConfigSchema } from '../validators/studioConfig.validators.js';
import { createInventorySchema, updateInventorySchema } from '../validators/inventory.validators.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

// Appointments
router.get('/appointments', appointmentController.adminList);
router.post('/appointments/:id/approve', appointmentController.approve);
router.post('/appointments/:id/reject', appointmentController.reject);
router.post('/appointments/:id/complete', appointmentController.complete);
router.post('/appointments/:id/cancel', validate(cancelAppointmentSchema), appointmentController.cancel);
router.post('/appointments/:id/log', validate(appointmentLogSchema), appointmentController.addLog);
router.get('/appointments/:id/logs', appointmentController.logs);

// Studio config
router.get('/studio-config', studioConfigController.get);
router.put('/studio-config', validate(studioConfigSchema), studioConfigController.update);

// Inventory
router.get('/inventory', inventoryController.list);
router.post('/inventory', validate(createInventorySchema), inventoryController.create);
router.put('/inventory/:id', validate(updateInventorySchema), inventoryController.update);
router.delete('/inventory/:id', inventoryController.delete);

export default router;