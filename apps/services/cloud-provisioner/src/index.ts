import { serve } from '@hono/node-server';
import { app } from './app.js';
import { logger } from '@tenxdev/service-utils';

const port = parseInt(process.env.PORT || '3004', 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(`Cloud Provisioner service running on port ${info.port}`);
  }
);
