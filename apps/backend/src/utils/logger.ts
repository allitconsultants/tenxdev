import pino from 'pino';

// Use process.env directly to avoid circular dependency with config
const nodeEnv = process.env.NODE_ENV || 'development';

export const logger = pino({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
