import { serve } from '@hono/node-server';
import { app } from './app';
import { logger } from '@tenxdev/service-utils';

const port = parseInt(process.env.PORT || '3003', 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(`Domains service running on port ${info.port}`);
  }
);
