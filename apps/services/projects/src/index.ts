import { serve } from '@hono/node-server';
import { app } from './app';
import { logger } from '@tenxdev/service-utils';

const port = parseInt(process.env.PORT || '3001', 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(`Projects service running on port ${info.port}`);
  }
);
