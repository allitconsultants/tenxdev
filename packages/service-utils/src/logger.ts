import pino from 'pino';

export const logger = (pino as unknown as typeof pino.default)({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});

export type Logger = typeof logger;
