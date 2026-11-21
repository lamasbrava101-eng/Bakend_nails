import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import techSheetRoutes from './routes/techSheet.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import { studioConfigController } from './controllers/studioConfig.controller.js';
import { catalogController } from './controllers/catalog.controller.js';
import { adminClientsController } from './controllers/adminClients.controller.js';
import { appointmentController } from './controllers/appointment.controller.js';
import { requireAuth } from './middleware/requireAuth.js';
import { optionalAuth } from './middleware/optionalAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { validate } from './middleware/validate.js';
import { quoteSchema } from './validators/catalog.validators.js';
import { studioConfigSchema } from './validators/studioConfig.validators.js';
import { completeAppointmentSchema } from './validators/appointment.validators.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();
  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
          return cb(null, origin);
        }
        // allow tunnel/dev origins dynamically
        if (
          origin.includes('trycloudflare.com') ||
          origin.includes('loca.lt') ||
          origin.includes('ngrok-free.app') ||
          origin.includes('ngrok.io') ||
          origin.includes('vercel.app') ||
          origin.includes('netlify.app') ||
          origin.includes('onrender.com') ||
          origin.includes('railway.app')
        ) {
          return cb(null, origin);
        }
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/me', meRoutes);
  api.use('/clients', techSheetRoutes);
  api.use('/catalog', catalogRoutes);
  api.post('/quote', validate(quoteSchema), catalogController.quote);

  // Citas (operación staff): consulta y registro de trabajo realizado
  api.get('/appointments', requireAuth, requireRole('ADMIN', 'MANICURIST'), appointmentController.staffList);
  api.patch('/appointments/:id/complete', requireAuth, requireRole('ADMIN', 'MANICURIST'), validate(completeAppointmentSchema), appointmentController.complete);

  api.use('/', appointmentRoutes);
  api.get('/studio-config', optionalAuth, studioConfigController.get);
  // Mutaciones de configuración del estudio: solo ADMIN
  api.put('/studio-config', requireAuth, requireRole('ADMIN'), validate(studioConfigSchema), studioConfigController.update);
  api.patch('/studio-config', requireAuth, requireRole('ADMIN'), validate(studioConfigSchema), studioConfigController.update);
  api.get('/admin/clients', requireAuth, requireRole('ADMIN', 'MANICURIST'), adminClientsController.list);
  api.use('/admin', adminRoutes);
  api.use('/inventory', inventoryRoutes);
  app.use('/api/v1', api);

  app.use(errorHandler);
  return app;
}