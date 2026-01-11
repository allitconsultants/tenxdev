import { Context, Next } from 'hono';
import { logger } from '../logger.js';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);

  await next();

  const duration = Date.now() - start;

  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });
}
