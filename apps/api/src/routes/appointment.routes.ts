import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validate } from '../middleware/validate.js';
import { createAppointmentSchema, voucherSchema } from '../validators/appointment.validators.js';

const router = Router();

router.get('/availability', appointmentController.availability);
router.post('/appointments', validate(createAppointmentSchema), appointmentController.create);
router.get('/appointments/:id', optionalAuth, appointmentController.get);
router.post('/appointments/:id/voucher', validate(voucherSchema), appointmentController.voucher);

export default router;