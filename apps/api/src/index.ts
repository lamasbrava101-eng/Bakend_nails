import { createApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './jobs/scheduler.js';

const app = createApp();
app.listen(env.port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`NailStudio API listening on port ${env.port}`);
  startScheduler();
});