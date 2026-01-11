import { serve } from '@hono/node-server';
import { app } from './app.js';
import { logger } from '@tenxdev/service-utils';

const port = parseInt(process.env.PORT || '3005', 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(`Documents service running on port ${info.port}`);
  }
);
