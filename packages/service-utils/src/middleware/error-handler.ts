import { Context } from 'hono';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

export function errorHandler(err: Error, c: Context) {
  logger.error({ err }, 'Request error');

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.code,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 500
    );
  }

  // Don't expose internal errors
  return c.json(
    {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
}
